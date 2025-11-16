import { GAME_STATE } from '../core/game-state.js';
import { refreshCollapsibles } from '../core/collapsible.js';

const FuturesWidget = {
    currentView: 'LME',  // Default view
    chart: null,         // Chart.js instance

    init() {
        this.currentView = 'LME';
        this.render();
        this.renderGraph();
        this.makePanelDraggable();
    },

    // Store trade panel state
    tradePanel: {
        exchange: null,
        contract: null,
        direction: null,
        price: 0
    },

    setView(view) {
        this.currentView = view;

        // Update button states
        document.querySelectorAll('.futures-toggle-btn').forEach(btn => {
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Re-render everything
        this.renderGraph();
        this.renderAvailableContracts(document.getElementById('futuresAvailableTable'));
    },

    getMonthName(monthIndex) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[monthIndex % 12];
    },

    getTermStructureData() {
        const monthData = GAME_STATE.currentMonthData;
        const currentTurn = GAME_STATE.currentTurn;

        // Current turn is 1-based (Jan=1, Feb=2, etc.)
        // Convert to 0-based for month array
        const currentMonthIndex = currentTurn - 1;

        // Calculate month indices for M+1, M+3, M+12
        const m1Index = currentMonthIndex + 1;
        const m3Index = currentMonthIndex + 3;
        const m12Index = currentMonthIndex + 12;

        // X-axis labels
        const labels = [
            `${this.getMonthName(currentMonthIndex)}\n(Spot)`,
            `${this.getMonthName(m1Index)}\n(M+1)`,
            `${this.getMonthName(m3Index)}\n(M+3)`,
            `${this.getMonthName(m12Index)}\n(M+12)`
        ];

        // Y-axis data
        const lmeData = [
            monthData.PRICING.LME.SPOT_AVG,
            monthData.PRICING.LME.FUTURES_1M,
            monthData.PRICING.LME.FUTURES_3M,
            monthData.PRICING.LME.FUTURES_12M
        ];

        const comexData = [
            monthData.PRICING.COMEX.SPOT_AVG,
            monthData.PRICING.COMEX.FUTURES_1M,
            monthData.PRICING.COMEX.FUTURES_3M,
            monthData.PRICING.COMEX.FUTURES_12M
        ];

        return { labels, lmeData, comexData };
    },

    renderGraph() {
        const canvas = document.getElementById('futuresChart');
        if (!canvas) {
            console.error('Canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        const { labels, lmeData, comexData } = this.getTermStructureData();

        const datasets = [];

        // Add LME data if LME or BOTH view
        if (this.currentView === 'LME' || this.currentView === 'BOTH') {
            datasets.push({
                label: 'LME',
                data: lmeData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                tension: 0.3
            });
        }

        // Add COMEX data if COMEX or BOTH view
        if (this.currentView === 'COMEX' || this.currentView === 'BOTH') {
            datasets.push({
                label: 'COMEX',
                data: comexData,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                tension: 0.3
            });
        }

        // Destroy old chart if exists
        if (this.chart) {
            this.chart.destroy();
        }

        // Create new chart
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2.5,
                plugins: {
                    legend: {
                        display: this.currentView === 'BOTH',
                        position: 'top',
                        labels: {
                            color: '#e0e0e0',
                            font: { size: 12, weight: 'bold' },
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#e0e0e0',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': $' +
                                       Math.round(context.parsed.y).toLocaleString('en-US') + '/MT';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#e0e0e0',
                            font: { size: 11, weight: 'bold' },
                            padding: 10
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#e0e0e0',
                            font: { size: 11 },
                            padding: 10,
                            callback: function(value) {
                                return '$' + Math.round(value).toLocaleString('en-US');
                            }
                        },
                        title: {
                            display: true,
                            text: 'Price ($/MT)',
                            color: '#e0e0e0',
                            font: { size: 12, weight: 'bold' },
                            padding: 10
                        }
                    }
                }
            }
        });
    },

    render() {
        const availableContainer = document.getElementById('futuresAvailableTable');
        const positionsContainer = document.getElementById('futuresPositionsTable');

        if (!availableContainer || !positionsContainer) {
            console.error('Futures widget containers not found');
            return;
        }

        this.renderAvailableContracts(availableContainer);
        this.renderOpenPositions(positionsContainer);
        this.updateSummary();

        // Refresh collapsibles for newly rendered content
        refreshCollapsibles();
    },

    renderAvailableContracts(container) {
        const monthData = GAME_STATE.currentMonthData;

        let contracts = [];

        // Build contract list based on view
        if (this.currentView === 'LME') {
            contracts = [
                { exchange: 'LME', contract: 'M+1', price: monthData.PRICING.LME.FUTURES_1M, size: '25 MT/contract' },
                { exchange: 'LME', contract: 'M+3', price: monthData.PRICING.LME.FUTURES_3M, size: '25 MT/contract' },
                { exchange: 'LME', contract: 'M+12', price: monthData.PRICING.LME.FUTURES_12M, size: '25 MT/contract' }
            ];
        } else if (this.currentView === 'COMEX') {
            contracts = [
                { exchange: 'COMEX', contract: 'M+1', price: monthData.PRICING.COMEX.FUTURES_1M, size: '11.34 MT/contract' },
                { exchange: 'COMEX', contract: 'M+3', price: monthData.PRICING.COMEX.FUTURES_3M, size: '11.34 MT/contract' },
                { exchange: 'COMEX', contract: 'M+12', price: monthData.PRICING.COMEX.FUTURES_12M, size: '11.34 MT/contract' }
            ];
        } else { // BOTH
            contracts = [
                { exchange: 'LME', contract: 'M+1', price: monthData.PRICING.LME.FUTURES_1M, size: '25 MT/contract' },
                { exchange: 'LME', contract: 'M+3', price: monthData.PRICING.LME.FUTURES_3M, size: '25 MT/contract' },
                { exchange: 'LME', contract: 'M+12', price: monthData.PRICING.LME.FUTURES_12M, size: '25 MT/contract' },
                { exchange: 'COMEX', contract: 'M+1', price: monthData.PRICING.COMEX.FUTURES_1M, size: '11.34 MT/contract' },
                { exchange: 'COMEX', contract: 'M+3', price: monthData.PRICING.COMEX.FUTURES_3M, size: '11.34 MT/contract' },
                { exchange: 'COMEX', contract: 'M+12', price: monthData.PRICING.COMEX.FUTURES_12M, size: '11.34 MT/contract' }
            ];
        }

        let html = '<table class="markets-table"><thead><tr><th>CONTRACT</th><th>SIZE</th><th>PRICE</th><th>ACTIONS</th></tr></thead><tbody>';

        // If BOTH view, add section headers
        if (this.currentView === 'BOTH') {
            // LME Section
            html += '<tr><td colspan="4" style="background: rgba(59, 130, 246, 0.2); font-weight: 700; padding: 10px; color: #3b82f6;">LME CONTRACTS</td></tr>';
            contracts.slice(0, 3).forEach(c => {
                html += this.renderContractRow(c);
            });

            // COMEX Section
            html += '<tr><td colspan="4" style="background: rgba(245, 158, 11, 0.2); font-weight: 700; padding: 10px; color: #f59e0b;">COMEX CONTRACTS</td></tr>';
            contracts.slice(3, 6).forEach(c => {
                html += this.renderContractRow(c);
            });
        } else {
            // Single exchange view
            contracts.forEach(c => {
                html += this.renderContractRow(c);
            });
        }

        html += '</tbody></table>';
        container.innerHTML = html;
    },

    renderContractRow(c) {
        return `
            <tr>
                <td><span class="exchange-badge">${c.exchange}</span> <strong>${c.contract}</strong></td>
                <td>${c.size}</td>
                <td>$${Math.round(c.price).toLocaleString('en-US')}/MT</td>
                <td>
                    <button class="trade-btn buy-btn" onclick="FuturesWidget.openPosition('${c.exchange}', '${c.contract}', 'LONG')">LONG</button>
                    <button class="trade-btn sell-btn" onclick="FuturesWidget.openPosition('${c.exchange}', '${c.contract}', 'SHORT')">SHORT</button>
                </td>
            </tr>
        `;
    },

    renderOpenPositions(container) {
        if (GAME_STATE.futuresPositions.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">No open futures positions</div>';
            return;
        }

        const html = `
            <table class="positions-table">
                <thead>
                    <tr>
                        <th>CONTRACT</th>
                        <th>DIRECTION</th>
                        <th>CONTRACTS</th>
                        <th>ENTRY</th>
                        <th>CURRENT</th>
                        <th>P&L</th>
                        <th>MARGIN</th>
                        <th>EXPIRY</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    ${GAME_STATE.futuresPositions.map(pos => {
                        const plClass = pos.unrealizedPL >= 0 ? 'price-positive' : 'price-negative';
                        const directionBadge = pos.direction === 'LONG' ? 'position-badge long' : 'position-badge short';

                        // Calculate expiry countdown
                        const turnsUntilExpiry = pos.expiryTurn - GAME_STATE.currentTurn;
                        let expiryClass = '';
                        let expiryIcon = '';
                        if (turnsUntilExpiry <= 1) {
                            expiryClass = 'expiry-critical';
                            expiryIcon = '🔴';
                        } else if (turnsUntilExpiry <= 3) {
                            expiryClass = 'expiry-warning';
                            expiryIcon = '🟡';
                        } else {
                            expiryClass = 'expiry-safe';
                            expiryIcon = '🟢';
                        }

                        // Calculate margin health
                        const marginHealth = (pos.marginBalance / pos.initialMargin) * 100;
                        let marginClass = '';
                        let marginIcon = '';
                        if (marginHealth < 80) {
                            marginClass = 'margin-critical';
                            marginIcon = '⚠️';
                        } else if (marginHealth < 100) {
                            marginClass = 'margin-warning';
                            marginIcon = '⚡';
                        } else {
                            marginClass = 'margin-healthy';
                            marginIcon = '✅';
                        }

                        return `
                            <tr>
                                <td><span class="exchange-badge">${pos.exchange}</span> <strong>${pos.contract}</strong></td>
                                <td><span class="${directionBadge}">${pos.direction}</span></td>
                                <td>${pos.numContracts} contract${pos.numContracts > 1 ? 's' : ''}<br><span style="font-size: 11px; color: #888;">(${pos.tonnage.toFixed(2)} MT)</span></td>
                                <td>$${Math.round(pos.entryPrice).toLocaleString('en-US')}</td>
                                <td>$${Math.round(pos.currentPrice).toLocaleString('en-US')}</td>
                                <td class="${plClass}">${pos.unrealizedPL >= 0 ? '+' : ''}$${Math.round(pos.unrealizedPL).toLocaleString('en-US')}</td>
                                <td class="${marginClass}">
                                    ${marginIcon} $${Math.round(pos.marginBalance).toLocaleString('en-US')}<br>
                                    <span style="font-size: 10px; color: #888;">${marginHealth.toFixed(0)}% health</span>
                                </td>
                                <td class="${expiryClass}">
                                    ${expiryIcon} ${turnsUntilExpiry} turn${turnsUntilExpiry > 1 ? 's' : ''}<br>
                                    <span style="font-size: 10px; color: #888;">Turn ${pos.expiryTurn}</span>
                                </td>
                                <td>
                                    <button class="trade-btn" onclick="FuturesWidget.closePosition(${pos.id})">CLOSE</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    },

    updateSummary() {
        const totalPL = GAME_STATE.futuresPositions.reduce((sum, p) => sum + p.unrealizedPL, 0);
        const plClass = totalPL >= 0 ? 'price-positive' : 'price-negative';

        const plEl = document.getElementById('futuresUnrealizedPL');
        const marginEl = document.getElementById('futuresMarginUsed');

        if (plEl) {
            plEl.textContent = `${totalPL >= 0 ? '+' : ''}$${Math.round(totalPL).toLocaleString('en-US')}`;
            plEl.className = plClass;
        }

        if (marginEl) {
            marginEl.textContent = `$${Math.round(GAME_STATE.futuresMarginPosted).toLocaleString('en-US')} / $${Math.round(GAME_STATE.futuresMarginLimit).toLocaleString('en-US')}`;
        }
    },

    openPosition(exchange, contract, direction) {
        // Store trade details
        this.tradePanel.exchange = exchange;
        this.tradePanel.contract = contract;
        this.tradePanel.direction = direction;

        const monthData = GAME_STATE.currentMonthData;
        const pricing = exchange === 'LME' ? monthData.PRICING.LME : monthData.PRICING.COMEX;

        // Get price for this contract
        let price;
        if (contract === 'M+1') {
            price = pricing.FUTURES_1M;
        } else if (contract === 'M+3') {
            price = pricing.FUTURES_3M;
        } else if (contract === 'M+12') {
            price = pricing.FUTURES_12M;
        }

        this.tradePanel.price = price;

        // Get spec for contract size
        const spec = GAME_STATE.FUTURES_SPECS[exchange];

        // Populate panel
        document.getElementById('futuresExchangeDisplay').textContent = exchange;
        document.getElementById('futuresContractDisplay').textContent = contract;
        document.getElementById('futuresDirectionDisplay').textContent = direction;
        document.getElementById('futuresDirectionDisplay').style.color = direction === 'LONG' ? '#10b981' : '#ef4444';
        document.getElementById('futuresCurrentPrice').textContent = `$${Math.round(price).toLocaleString('en-US')}/MT`;
        document.getElementById('futuresContractSize').textContent = `${spec.contractSize} MT/contract`;

        // Calculate max contracts based on available margin
        const availableMargin = GAME_STATE.futuresMarginLimit - GAME_STATE.futuresMarginPosted;
        const maxContracts = Math.floor(availableMargin / spec.initialMargin);
        document.getElementById('futuresMaxContracts').textContent = maxContracts;
        document.getElementById('futuresNumContracts').max = maxContracts;
        document.getElementById('futuresNumContracts').value = Math.min(1, maxContracts);

        // Update expiry info
        let expiryTurns;
        if (contract === 'M+1') expiryTurns = 1;
        else if (contract === 'M+3') expiryTurns = 3;
        else if (contract === 'M+12') expiryTurns = 12;
        document.getElementById('futuresExpiryInfo').textContent = `This ${contract} contract expires in ${expiryTurns} turn${expiryTurns > 1 ? 's' : ''}`;

        // Set panel title color
        const panelHeader = document.getElementById('futuresPanelHeader');
        if (direction === 'LONG') {
            panelHeader.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        } else {
            panelHeader.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        }

        // Update calculations
        this.updateTradePanelCalculations();

        // Show panel
        document.getElementById('futuresTradePanel').style.display = 'block';
    },

    updateTradePanelCalculations() {
        const numContractsInput = document.getElementById('futuresNumContracts');
        const numContracts = parseInt(numContractsInput.value) || 0;

        const spec = GAME_STATE.FUTURES_SPECS[this.tradePanel.exchange];
        const price = this.tradePanel.price;

        // Calculate values
        const totalTonnage = spec.contractSize * numContracts;
        const initialMargin = spec.initialMargin * numContracts;
        const openingFees = spec.openFee * numContracts;
        const totalDeducted = initialMargin + openingFees;

        // Update displays
        document.getElementById('futuresCalcContracts').textContent = numContracts;
        document.getElementById('futuresCalcTonnage').textContent = `${totalTonnage.toFixed(2)} MT`;
        document.getElementById('futuresCalcEntryPrice').textContent = `$${Math.round(price).toLocaleString('en-US')}/MT`;
        document.getElementById('futuresCalcMargin').textContent = `$${initialMargin.toLocaleString('en-US')}`;
        document.getElementById('futuresCalcFees').textContent = `$${openingFees.toLocaleString('en-US')}`;
        document.getElementById('futuresCalcTotal').textContent = `$${totalDeducted.toLocaleString('en-US')}`;

        // Check if user has enough funds
        const executeBtn = document.getElementById('executeFuturesBtn');
        if (GAME_STATE.practiceFunds < totalDeducted) {
            executeBtn.disabled = true;
            executeBtn.textContent = 'INSUFFICIENT FUNDS';
            executeBtn.style.opacity = '0.5';
        } else if (numContracts === 0) {
            executeBtn.disabled = true;
            executeBtn.textContent = 'ENTER NUMBER OF CONTRACTS';
            executeBtn.style.opacity = '0.5';
        } else {
            executeBtn.disabled = false;
            executeBtn.textContent = 'OPEN POSITION';
            executeBtn.style.opacity = '1';
        }
    },

    executeTradeFromPanel() {
        const numContracts = parseInt(document.getElementById('futuresNumContracts').value);

        if (!numContracts || numContracts <= 0) {
            alert('❌ Please enter a valid number of contracts');
            return;
        }

        const result = GAME_STATE.openFuturesPosition(
            this.tradePanel.exchange,
            this.tradePanel.contract,
            this.tradePanel.direction,
            numContracts
        );

        if (result.success) {
            alert(result.message);
            this.closeTradePanel();
            this.render();
        } else {
            alert(`❌ ${result.message}`);
        }
    },

    closeTradePanel() {
        document.getElementById('futuresTradePanel').style.display = 'none';
    },

    makePanelDraggable() {
        const panel = document.getElementById('futuresTradePanel');
        const header = document.getElementById('futuresPanelHeader');

        if (!panel || !header) return;

        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('trade-panel-close')) return;

            isDragging = true;
            initialX = e.clientX - (parseInt(panel.style.left) || 0);
            initialY = e.clientY - (parseInt(panel.style.top) || 0);
            header.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            panel.style.left = currentX + 'px';
            panel.style.top = currentY + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'grab';
            }
        });

        // Set initial position (center of screen)
        panel.style.position = 'fixed';
        panel.style.left = '50%';
        panel.style.top = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
        header.style.cursor = 'grab';
    },

    closePosition(positionId) {
        if (!confirm('Close this futures position?')) {
            return;
        }

        const result = GAME_STATE.closeFuturesPosition(positionId);

        if (result.success) {
            alert(`✅ ${result.message}`);
            this.render();
        } else {
            alert(`❌ ${result.message}`);
        }
    },

    toggleHelp() {
        const tooltip = document.getElementById('futuresHelpTooltip');
        if (!tooltip) return;

        // Populate content if empty
        if (!tooltip.innerHTML) {
            tooltip.innerHTML = `
                <div class="help-tooltip-header">
                    <strong>🎓 FUTURES TRADING GUIDE</strong>
                    <button class="help-close-btn" onclick="FuturesWidget.toggleHelp()">×</button>
                </div>
                <div class="help-tooltip-content">
                    <p><strong>What are Futures Contracts?</strong></p>
                    <p>Futures allow you to lock in prices for future copper delivery without buying physical metal. You can profit from price movements or hedge your physical positions.</p>

                    <p><strong>Contract Specifications:</strong></p>
                    <ul>
                        <li><strong>LME:</strong> 25 MT per contract, $9,000 initial margin</li>
                        <li><strong>COMEX:</strong> 11.34 MT per contract (25,000 lbs), $9,000 initial margin</li>
                    </ul>

                    <p><strong>How to Trade:</strong></p>
                    <ul>
                        <li><strong>LONG:</strong> Buy contracts if you expect prices to rise</li>
                        <li><strong>SHORT:</strong> Sell contracts if you expect prices to fall</li>
                    </ul>

                    <p><strong>Fees & Margin:</strong></p>
                    <ul>
                        <li>Opening fee: $25 per contract</li>
                        <li>Closing fee: $25 per contract</li>
                        <li>Initial margin: $9,000 per contract (posted from Practice Funds)</li>
                        <li>Margin limit: $100,000 total</li>
                    </ul>

                    <p><strong>Mark-to-Market (MTM):</strong></p>
                    <p>Each month, positions are revalued at current prices. If margin balance falls below initial margin, you'll receive a margin call requiring a top-up from Practice Funds or face force liquidation.</p>

                    <p><strong>Offset Closing:</strong></p>
                    <p>Opening an opposite position (e.g., SHORT when you have LONG) automatically closes your existing position(s) using FIFO (First In First Out), settling P&L immediately.</p>

                    <p><strong>Expiry:</strong></p>
                    <ul>
                        <li>M+1 contracts expire in 1 turn</li>
                        <li>M+3 contracts expire in 3 turns</li>
                        <li>M+12 contracts expire in 12 turns</li>
                    </ul>
                    <p>At expiry, positions auto-close with final P&L settlement.</p>
                </div>
            `;
        }

        if (tooltip.style.display === 'none' || tooltip.style.display === '') {
            tooltip.style.display = 'block';
        } else {
            tooltip.style.display = 'none';
        }
    }
};

// Expose to global scope
window.FuturesWidget = FuturesWidget;

export { FuturesWidget };
