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

    /**
     * Analyzes term structure and returns market insights
     */
    analyzeMarketStructure() {
        const { lmeData, comexData } = this.getTermStructureData();

        // Determine which data to analyze based on current view
        let data = lmeData;
        let exchange = 'LME';

        if (this.currentView === 'COMEX') {
            data = comexData;
            exchange = 'COMEX';
        } else if (this.currentView === 'BOTH') {
            // For BOTH view, analyze whichever has stronger signal
            const lmeSlope = lmeData[3] - lmeData[0];
            const comexSlope = comexData[3] - comexData[0];
            if (Math.abs(comexSlope) > Math.abs(lmeSlope)) {
                data = comexData;
                exchange = 'COMEX';
            }
        }

        const spot = data[0];
        const m1 = data[1];
        const m3 = data[2];
        const m12 = data[3];

        // Calculate slopes
        const shortTermSlope = m1 - spot;
        const mediumTermSlope = m3 - m1;
        const longTermSlope = m12 - m3;
        const overallSlope = m12 - spot;

        // Determine market structure
        let structure, icon, color, explanation, strategy;

        if (overallSlope > 50) {
            // Strong Contango
            structure = 'STRONG CONTANGO';
            icon = '⬆️⬆️';
            color = '#10b981'; // Green
            explanation = `Futures prices are significantly higher than spot ($${Math.round(overallSlope)}/MT premium). Market expects prices to rise.`;
            strategy = '💡 STRATEGY: Consider LONG futures to profit from expected price increases, or delay physical purchases to buy at lower current prices.';
        } else if (overallSlope > 10 && overallSlope <= 50) {
            // Mild Contango
            structure = 'MILD CONTANGO';
            icon = '⬆️';
            color = '#3b82f6'; // Blue
            explanation = `Futures prices are slightly higher than spot ($${Math.round(overallSlope)}/MT premium). Normal carrying cost structure.`;
            strategy = '💡 STRATEGY: Good time for physical trading with SHORT futures hedge. Contango covers storage costs.';
        } else if (overallSlope >= -10 && overallSlope <= 10) {
            // Flat
            structure = 'FLAT CURVE';
            icon = '➡️';
            color = '#fbbf24'; // Yellow
            explanation = `Spot and futures prices are nearly equal. Market is balanced with no strong directional bias.`;
            strategy = '💡 STRATEGY: Focus on physical trading spreads. Futures hedging optional unless you have large exposure.';
        } else if (overallSlope >= -50 && overallSlope < -10) {
            // Mild Backwardation
            structure = 'MILD BACKWARDATION';
            icon = '⬇️';
            color = '#f59e0b'; // Orange
            explanation = `Spot prices are higher than futures ($${Math.abs(Math.round(overallSlope))}/MT premium). Supply is slightly tight.`;
            strategy = '💡 STRATEGY: Consider SHORT futures to lock in selling prices. Good time to sell physical positions quickly.';
        } else {
            // Strong Backwardation
            structure = 'STRONG BACKWARDATION';
            icon = '⬇️⬇️';
            color = '#ef4444'; // Red
            explanation = `Spot prices are significantly higher than futures ($${Math.abs(Math.round(overallSlope))}/MT premium). Supply shortage!`;
            strategy = '💡 STRATEGY: URGENT - SHORT futures to protect physical positions. Sell physical inventory ASAP to capture premium.';
        }

        return {
            structure,
            icon,
            color,
            explanation,
            strategy,
            exchange,
            slope: overallSlope
        };
    },

    /**
     * Renders smart annotation below the graph
     */
    renderGraphAnnotation() {
        const annotation = this.analyzeMarketStructure();

        // Find or create annotation container
        let annotationEl = document.getElementById('futuresGraphAnnotation');
        if (!annotationEl) {
            const graphContainer = document.querySelector('.futures-graph-container');
            if (!graphContainer) return;

            annotationEl = document.createElement('div');
            annotationEl.id = 'futuresGraphAnnotation';
            graphContainer.appendChild(annotationEl);
        }

        annotationEl.innerHTML = `
            <div style="
                margin-top: 15px;
                padding: 15px;
                background: rgba(30, 30, 30, 0.8);
                border-left: 4px solid ${annotation.color};
                border-radius: 6px;
            ">
                <div style="
                    font-size: 14px;
                    font-weight: 700;
                    color: ${annotation.color};
                    margin-bottom: 8px;
                ">
                    ${annotation.icon} ${annotation.structure} (${annotation.exchange})
                </div>
                <div style="
                    font-size: 13px;
                    line-height: 1.5;
                    color: var(--text-secondary);
                    margin-bottom: 10px;
                ">
                    ${annotation.explanation}
                </div>
                <div style="
                    font-size: 13px;
                    line-height: 1.5;
                    color: var(--text-primary);
                    font-weight: 600;
                    padding: 10px;
                    background: rgba(59, 130, 246, 0.1);
                    border-radius: 4px;
                ">
                    ${annotation.strategy}
                </div>
            </div>
        `;
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
                aspectRatio: 3.5,
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

        // Render smart annotation after graph is created
        this.renderGraphAnnotation();
    },

    render() {
        const availableContainer = document.getElementById('futuresAvailableTable');
        const positionsContainer = document.getElementById('futuresPositionsTable');
        const marginContainer = document.getElementById('futuresMarginBreakdown');

        if (!availableContainer || !positionsContainer) {
            console.error('Futures widget containers not found');
            return;
        }

        this.renderAvailableContracts(availableContainer);
        this.renderOpenPositions(positionsContainer);
        this.renderMarginBreakdown(marginContainer);
        this.updateSummary();

        // Refresh collapsibles for newly rendered content
        refreshCollapsibles();
    },

    renderAvailableContracts(container) {
        const monthData = GAME_STATE.currentMonthData;

        // Defensive check: ensure month data is loaded
        if (!monthData || !monthData.PRICING) {
            console.warn('FuturesWidget: Month data not loaded yet');
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">Loading market data...</div>';
            return;
        }

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
                    <button class="trade-btn futures-long-btn" onclick="FuturesWidget.openPosition('${c.exchange}', '${c.contract}', 'LONG')">LONG</button>
                    <button class="trade-btn futures-short-btn" onclick="FuturesWidget.openPosition('${c.exchange}', '${c.contract}', 'SHORT')">SHORT</button>
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
                        <th>DIR</th>
                        <th>SIZE</th>
                        <th>PRICE</th>
                        <th>P&L</th>
                        <th>MARGIN</th>
                        <th>EXP</th>
                        <th>ACTION</th>
                    </tr>
                </thead>
                <tbody>
                    ${GAME_STATE.futuresPositions.map(pos => {
                        const plClass = pos.unrealizedPL >= 0 ? 'price-positive' : 'price-negative';
                        const directionBadge = pos.direction === 'LONG' ? 'badge-long' : 'badge-short';

                        // Calculate expiry countdown
                        const turnsUntilExpiry = pos.expiryTurn - GAME_STATE.currentTurn;
                        let expiryClass = '';
                        if (turnsUntilExpiry <= 1) {
                            expiryClass = 'expiry-urgent';
                        } else if (turnsUntilExpiry <= 2) {
                            expiryClass = 'expiry-warning';
                        } else {
                            expiryClass = 'expiry-safe';
                        }

                        // Calculate margin health
                        const marginHealth = pos.marginBalance / pos.initialMargin;
                        let marginClass = '';
                        if (marginHealth < 1.0) {
                            marginClass = 'price-negative';
                        } else if (marginHealth < 1.1) {
                            marginClass = 'price-warning';
                        }

                        return `
                            <tr>
                                <td>
                                    <span class="exchange-badge">${pos.exchange}</span><br>
                                    <strong>${pos.contract}</strong>
                                </td>
                                <td><span class="${directionBadge}">${pos.direction}</span></td>
                                <td title="${pos.numContracts} contracts">${pos.tonnage.toFixed(1)} MT</td>
                                <td>$${Math.round(pos.currentPrice).toLocaleString('en-US')}</td>
                                <td class="${plClass}">${pos.unrealizedPL >= 0 ? '+' : ''}$${Math.round(pos.unrealizedPL).toLocaleString('en-US')}</td>
                                <td class="${marginClass}">$${Math.round(pos.marginBalance).toLocaleString('en-US')}</td>
                                <td class="${expiryClass}">${turnsUntilExpiry}T</td>
                                <td>
                                    <button class="trade-btn" style="font-size: 11px; padding: 4px 8px;" onclick="FuturesWidget.showCloseInfo(${pos.id})">CLOSE</button>
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

    renderMarginBreakdown(container) {
        if (!container) return;

        if (GAME_STATE.futuresPositions.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">No open futures positions</div>';
            return;
        }

        const marginCalc = GAME_STATE.calculateMarginWithNetting();

        let html = `
            <table class="positions-table" style="font-size: 12px;">
                <thead>
                    <tr>
                        <th>CONTRACT</th>
                        <th>LONG</th>
                        <th>SHORT</th>
                        <th>NET</th>
                        <th>MARGIN</th>
                    </tr>
                </thead>
                <tbody>
                    ${marginCalc.breakdown.map(row => {
                        let netDisplay = '';
                        if (row.netDirection === 'FLAT') {
                            netDisplay = '<span style="color: #888;">FLAT</span>';
                        } else {
                            netDisplay = `<span class="${row.netDirection === 'LONG' ? 'price-positive' : 'price-negative'}">${row.netContracts}${row.netDirection.charAt(0)}</span>`;
                        }

                        return `
                            <tr>
                                <td><strong>${row.contract}</strong></td>
                                <td>${row.longContracts || '-'}</td>
                                <td>${row.shortContracts || '-'}</td>
                                <td>${netDisplay}</td>
                                <td>$${Math.round(row.margin).toLocaleString('en-US')}</td>
                            </tr>
                        `;
                    }).join('')}
                    <tr style="border-top: 2px solid var(--border-color); font-weight: 700;">
                        <td colspan="4" style="text-align: right; padding-top: 12px; color: #3b82f6;">TOTAL MARGIN POSTED:</td>
                        <td style="padding-top: 12px; color: #3b82f6;">$${Math.round(marginCalc.totalMargin).toLocaleString('en-US')}</td>
                    </tr>
                </tbody>
            </table>
        `;

        if (marginCalc.marginSaved > 0) {
            html += `
                <div style="
                    margin-top: 15px;
                    padding: 12px;
                    background: rgba(16, 185, 129, 0.1);
                    border-left: 4px solid #10b981;
                    border-radius: 6px;
                    font-size: 12px;
                    color: #10b981;
                ">
                    💰 <strong>Margin Saved:</strong> $${Math.round(marginCalc.marginSaved).toLocaleString('en-US')}
                    (vs $${Math.round(marginCalc.marginWithoutNetting).toLocaleString('en-US')} without netting)
                </div>
            `;
        }

        container.innerHTML = html;
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

    showCloseInfo(positionId) {
        const position = GAME_STATE.futuresPositions.find(p => p.id === positionId);
        if (!position) return;

        const turnsToExpiry = position.expiryTurn - GAME_STATE.currentTurn;
        const oppositeDirection = position.direction === 'LONG' ? 'SHORT' : 'LONG';

        // Create popup overlay
        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        popup.innerHTML = `
            <div style="
                background: var(--bg-secondary);
                border: 2px solid #3b82f6;
                border-radius: 12px;
                width: 500px;
                max-width: 90%;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            ">
                <div style="
                    background: rgba(59, 130, 246, 0.2);
                    padding: 20px;
                    border-bottom: 2px solid #3b82f6;
                    border-radius: 10px 10px 0 0;
                ">
                    <div style="
                        color: #3b82f6;
                        font-size: 16px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">❓ How to Close This Position</div>
                </div>

                <div style="padding: 25px; color: var(--text-primary);">
                    <p style="margin-bottom: 20px; color: #e0e0e0; font-size: 14px;">You have 2 options to close your <strong>${position.exchange} ${position.contract} ${position.direction}</strong> position:</p>

                    <div style="
                        background: rgba(251, 191, 36, 0.1);
                        border-left: 4px solid #fbbf24;
                        padding: 15px;
                        margin-bottom: 20px;
                        border-radius: 6px;
                    ">
                        <div style="font-size: 18px; margin-bottom: 10px;">1️⃣ <strong style="color: #fbbf24;">Wait for Expiry</strong></div>
                        <div style="font-size: 13px; line-height: 1.6; color: #d0d0d0;">
                            Contract expires in <span style="color: ${turnsToExpiry <= 1 ? '#ef4444' : '#fbbf24'}; font-weight: 700;">${turnsToExpiry} turn${turnsToExpiry > 1 ? 's' : ''}</span><br>
                            Position will auto-close at expiry<br>
                            Final P&L will be settled automatically
                        </div>
                    </div>

                    <div style="
                        background: rgba(59, 130, 246, 0.1);
                        border-left: 4px solid #3b82f6;
                        padding: 15px;
                        margin-bottom: 20px;
                        border-radius: 6px;
                    ">
                        <div style="font-size: 18px; margin-bottom: 10px;">2️⃣ <strong style="color: #3b82f6;">Open Opposite Position</strong></div>
                        <div style="font-size: 13px; line-height: 1.6; color: #d0d0d0;">
                            Open opposite trade: <strong>${position.numContracts} ${oppositeDirection} ${position.exchange} ${position.contract}</strong><br>
                            <strong style="color: #10b981;">Both positions remain open.</strong> Your opposite position will reduce net exposure and margin requirements via netting.<br>
                            Margin benefit: Offset pairs only need $1,000 each (vs $9,000 unhedged)
                        </div>
                    </div>

                    <button onclick='this.closest("div[style*=\\"position: fixed\\"]").remove()' style="
                        width: 100%;
                        background: linear-gradient(135deg, #3b82f6, #2563eb);
                        border: none;
                        color: white;
                        padding: 12px;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 700;
                        text-transform: uppercase;
                        cursor: pointer;
                        transition: transform 0.2s;
                        letter-spacing: 0.5px;
                    " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        Got it!
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        // Close on background click
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });
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

                    <p><strong>💰 Margin Netting:</strong></p>
                    <p>Opposite positions in the same contract offset each other, reducing margin. Each unhedged contract requires $9,000 margin. Offset pairs only need $1,000 each. Example: 3 LONG + 1 SHORT = 1 offset ($1K) + 2 net ($18K) = $19K total.</p>

                    <p><strong>Mark-to-Market (MTM):</strong></p>
                    <p>Each month, positions are revalued at current prices. If margin balance falls below initial margin, you'll receive a margin call requiring a top-up from Practice Funds or face force liquidation.</p>

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
