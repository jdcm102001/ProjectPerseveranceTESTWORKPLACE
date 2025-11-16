import { GAME_STATE } from '../core/game-state.js';

const FuturesWidget = {
    init() {
        this.render();
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

        const contracts = [
            { exchange: 'LME', contract: 'M+1', price: monthData.PRICING.LME.FUTURES_1M },
            { exchange: 'LME', contract: 'M+3', price: monthData.PRICING.LME.FUTURES_3M },
            { exchange: 'LME', contract: 'M+12', price: monthData.PRICING.LME.FUTURES_12M },
            { exchange: 'COMEX', contract: 'M+1', price: monthData.PRICING.COMEX.FUTURES_1M },
            { exchange: 'COMEX', contract: 'M+3', price: monthData.PRICING.COMEX.FUTURES_3M },
            { exchange: 'COMEX', contract: 'M+12', price: monthData.PRICING.COMEX.FUTURES_12M }
        ];

        const html = `
            <table class="markets-table">
                <thead>
                    <tr>
                        <th>CONTRACT</th>
                        <th>PRICE</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    ${contracts.map(c => `
                        <tr>
                            <td><span class="exchange-badge">${c.exchange}</span> <strong>${c.contract}</strong></td>
                            <td>$${Math.round(c.price).toLocaleString('en-US')}/MT</td>
                            <td>
                                <button class="trade-btn buy-btn" onclick="FuturesWidget.openPosition('${c.exchange}', '${c.contract}', 'LONG')">LONG</button>
                                <button class="trade-btn sell-btn" onclick="FuturesWidget.openPosition('${c.exchange}', '${c.contract}', 'SHORT')">SHORT</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
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

        document.getElementById('futuresUnrealizedPL').textContent = `${totalPL >= 0 ? '+' : ''}$${Math.round(totalPL).toLocaleString('en-US')}`;
        document.getElementById('futuresUnrealizedPL').className = plClass;

        document.getElementById('futuresMarginUsed').textContent = `$${Math.round(GAME_STATE.futuresMarginUsed).toLocaleString('en-US')} / $${Math.round(GAME_STATE.futuresMarginLimit).toLocaleString('en-US')}`;
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
