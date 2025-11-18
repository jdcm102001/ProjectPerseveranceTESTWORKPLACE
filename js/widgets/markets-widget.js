import { GAME_STATE } from '../core/game-state.js';
import { TradePanel } from '../core/trade-panel.js';
import { refreshCollapsibles } from '../core/collapsible.js';

const MarketsWidget = {
    init() {
        if (!GAME_STATE.currentMonthData) {
            console.error('No month data loaded');
            return;
        }
        this.populateSuppliersTable();
        this.populateBuyersTable();
        refreshCollapsibles();
    },

    populateSuppliersTable() {
        const monthData = GAME_STATE.currentMonthData;
        const tbody = document.getElementById('suppliersTableBody');
        if (!tbody) return;

        const peruvianData = monthData.MARKET_DEPTH.SUPPLY.PERUVIAN;
        const chileanData = monthData.MARKET_DEPTH.SUPPLY.CHILEAN;

        // Calculate remaining availability
        const ltaRemaining = peruvianData.LTA_FIXED_MT - GAME_STATE.monthlyPurchases.CALLAO_LTA;
        const spotRemaining = peruvianData.MAX_OPTIONAL_SPOT_MT - GAME_STATE.monthlyPurchases.CALLAO_SPOT;
        const chileanRemaining = chileanData.MAX_AVAILABLE_MT - GAME_STATE.monthlyPurchases.ANTOFAGASTA_SPOT;

        let rows = [];

        // Show Callao LTA row only if Peruvian is primary
        if (peruvianData.IS_PRIMARY) {
            rows.push(`
                <tr>
                    <td><span class="port-name">CALLAO</span><span class="badge badge-lta">LTA</span></td>
                    <td>${ltaRemaining} MT REMAINING ${ltaRemaining === 0 ? '(SOLD OUT)' : ''}</td>
                    <td>LME M+1</td>
                    <td class="premium-positive">+$${peruvianData.SUPPLIER_PREMIUM_USD}/MT</td>
                    <td><button class="trade-btn buy-btn" ${ltaRemaining === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} data-action="buy" data-supplier="CALLAO" data-port="Callao, Peru" data-min="${peruvianData.LTA_FIXED_MT}" data-max="${peruvianData.LTA_FIXED_MT}" data-basis="LME" data-premium="${peruvianData.SUPPLIER_PREMIUM_USD}" data-islta="true">TRADE</button></td>
                </tr>
            `);
            rows.push(`
                <tr>
                    <td><span class="port-name">CALLAO</span><span class="badge badge-spot">SPOT</span></td>
                    <td>${peruvianData.LTA_FIXED_MT}–${spotRemaining} MT ${spotRemaining === 0 ? '(SOLD OUT)' : 'REMAINING'}</td>
                    <td>LME / COMEX M+1</td>
                    <td class="premium-positive">+$${peruvianData.SUPPLIER_PREMIUM_USD}/MT</td>
                    <td><button class="trade-btn buy-btn" ${spotRemaining === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} data-action="buy" data-supplier="CALLAO" data-port="Callao, Peru" data-min="${peruvianData.LTA_FIXED_MT}" data-max="${spotRemaining}" data-basis="LME_COMEX" data-premium="${peruvianData.SUPPLIER_PREMIUM_USD}" data-islta="false">TRADE</button></td>
                </tr>
            `);
        }

        // Show Antofagasta row only if Chilean is primary
        if (chileanData.IS_PRIMARY) {
            rows.push(`
                <tr>
                    <td><span class="port-name">ANTOFAGASTA</span><span class="badge badge-spot">SPOT</span></td>
                    <td>${chileanData.MIN_AVAILABLE_MT}–${chileanRemaining} MT ${chileanRemaining === 0 ? '(SOLD OUT)' : 'REMAINING'}</td>
                    <td>LME / COMEX M+1</td>
                    <td>$${chileanData.SUPPLIER_PREMIUM_USD}/MT</td>
                    <td><button class="trade-btn buy-btn" ${chileanRemaining === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} data-action="buy" data-supplier="ANTOFAGASTA" data-port="Antofagasta, Chile" data-min="${chileanData.MIN_AVAILABLE_MT}" data-max="${chileanRemaining}" data-basis="LME_COMEX" data-premium="${chileanData.SUPPLIER_PREMIUM_USD}" data-islta="false">TRADE</button></td>
                </tr>
            `);
        }

        tbody.innerHTML = rows.join('');
    },

    populateBuyersTable() {
        const monthData = GAME_STATE.currentMonthData;
        const tbody = document.getElementById('buyersTableBody');
        if (!tbody) return;

        // Filter to show only primary buyers
        const primaryBuyers = monthData.CLIENTS.OPPORTUNITIES.filter(buyer => buyer.IS_PRIMARY === true);

        tbody.innerHTML = primaryBuyers.map(buyer => {
            const remaining = buyer.MAX_QUANTITY_MT - (GAME_STATE.monthlySales[buyer.REGION] || 0);
            const soldOut = remaining === 0;

            // Combine buyer name + demand into single cell
            const buyerInfo = `
                <span class="port-name">${buyer.REGION}</span>
                <div style="font-size: 11px; color: #888; margin-top: 4px;">
                    ${buyer.MIN_QUANTITY_MT}–${remaining} MT ${soldOut ? '(SOLD OUT)' : ''}
                </div>
            `;

            // Combine exchange + QP + premium into single cell
            const pricingInfo = `
                <span class="exchange-badge">${buyer.REFERENCE_EXCHANGE}</span>
                <span class="exchange-badge" style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; border-color: #fbbf24; margin-left: 4px;">M+1</span>
                <div class="premium-positive" style="margin-top: 4px;">+$${buyer.REGIONAL_PREMIUM_USD}/MT</div>
            `;

            return `
                <tr>
                    <td>${buyerInfo}</td>
                    <td>${buyer.PORT_OF_DISCHARGE}</td>
                    <td>${pricingInfo}</td>
                    <td><button class="trade-btn sell-btn" ${soldOut ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} data-action="sell" data-buyer="${buyer.REGION}" data-dest="${buyer.PORT_OF_DISCHARGE}" data-min="${buyer.MIN_QUANTITY_MT}" data-max="${remaining}" data-exchange="${buyer.REFERENCE_EXCHANGE}" data-premium="${buyer.REGIONAL_PREMIUM_USD}">TRADE</button></td>
                </tr>
            `;
        }).join('');
    }
};

// Export the MarketsWidget object
export { MarketsWidget };
