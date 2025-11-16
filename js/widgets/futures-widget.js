import { GAME_STATE } from '../core/game-state.js';

const FuturesWidget = {
    currentView: 'LME',  // Default view
    chart: null,         // Chart.js instance

    init() {
        this.currentView = 'LME';
        this.render();
        this.renderGraph();
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
                        <th>TONNAGE</th>
                        <th>ENTRY</th>
                        <th>CURRENT</th>
                        <th>P&L</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    ${GAME_STATE.futuresPositions.map(pos => {
                        const plClass = pos.unrealizedPL >= 0 ? 'price-positive' : 'price-negative';
                        const directionBadge = pos.direction === 'LONG' ? 'position-badge long' : 'position-badge short';

                        return `
                            <tr>
                                <td><span class="exchange-badge">${pos.exchange}</span> <strong>${pos.contract}</strong></td>
                                <td><span class="${directionBadge}">${pos.direction}</span></td>
                                <td>${pos.numContracts} × ${pos.contractSize} MT</td>
                                <td>${pos.tonnage} MT</td>
                                <td>$${Math.round(pos.entryPrice).toLocaleString('en-US')}</td>
                                <td>$${Math.round(pos.currentPrice).toLocaleString('en-US')}</td>
                                <td class="${plClass}">${pos.unrealizedPL >= 0 ? '+' : ''}$${Math.round(pos.unrealizedPL).toLocaleString('en-US')}</td>
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
            marginEl.textContent = `$${Math.round(GAME_STATE.futuresMarginUsed).toLocaleString('en-US')} / $${Math.round(GAME_STATE.futuresMarginLimit).toLocaleString('en-US')}`;
        }
    },

    openPosition(exchange, contract, direction) {
        const tonnage = prompt(`Enter tonnage for ${direction} ${exchange} ${contract}:`, '10');

        if (!tonnage || tonnage <= 0) {
            return;
        }

        const result = GAME_STATE.openFuturesPosition(exchange, contract, direction, parseFloat(tonnage));

        if (result.success) {
            alert(`✅ ${result.message}`);
            this.render();
        } else {
            alert(`❌ ${result.message}`);
        }
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
    }
};

// Expose to global scope
window.FuturesWidget = FuturesWidget;

export { FuturesWidget };
