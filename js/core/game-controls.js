import { GAME_STATE } from './game-state.js';
import { PositionsWidget } from '../widgets/positions-widget.js';
import { MarketsWidget } from '../widgets/markets-widget.js';
import { FuturesWidget } from '../widgets/futures-widget.js';

function advanceTurn() {
    if (!confirm(`Advance to next turn?\n\nThis will:\n- Charge interest on LOC: $${Math.round(GAME_STATE.locInterestNextMonth).toLocaleString('en-US')}\n- Move to ${GAME_STATE.currentTurn === 1 ? 'February' : GAME_STATE.currentTurn === 2 ? 'March' : GAME_STATE.currentTurn === 3 ? 'April' : 'May'}\n- Reset monthly limits\n- Update position statuses`)) {
        return;
    }

    // Process settlements BEFORE advancing turn
    const settledPositions = GAME_STATE.processSettlements(GAME_STATE.currentTurn + 1);

    // Charge interest
    GAME_STATE.practiceFunds -= GAME_STATE.locInterestNextMonth;
    GAME_STATE.totalPL -= GAME_STATE.locInterestNextMonth;

    const interestCharged = GAME_STATE.locInterestNextMonth;

    GAME_STATE.currentTurn++;
    GAME_STATE.resetMonthlyLimits();

    // Update futures prices to market
    GAME_STATE.updateFuturesPrices();

    // Update position statuses
    GAME_STATE.updatePositionStatus(GAME_STATE.currentTurn);

    // Load next month data from window object
    const monthMap = {
        2: window.FEBRUARY_DATA,
        3: window.MARCH_DATA,
        4: window.APRIL_DATA
    };

    if (monthMap[GAME_STATE.currentTurn]) {
        GAME_STATE.currentMonthData = monthMap[GAME_STATE.currentTurn];
        GAME_STATE.currentMonth = GAME_STATE.currentMonthData.MONTH;
    } else {
        alert('End of simulation! Only 4 months available.');
        return;
    }

    GAME_STATE.updateHeader();

    // Refresh all widgets
    MarketsWidget.init();
    PositionsWidget.render();
    FuturesWidget.render();

    alert(`✅ Advanced to ${GAME_STATE.currentMonth}!\n\nInterest Charged: $${Math.round(interestCharged).toLocaleString('en-US')}\nMonthly limits reset.\n${GAME_STATE.physicalPositions.filter(p => p.status === 'ARRIVED').length} position(s) arrived.`);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = sidebar.querySelector('.sidebar-toggle');
    sidebar.classList.toggle('collapsed');

    if (sidebar.classList.contains('collapsed')) {
        toggle.textContent = '▶';
    } else {
        toggle.textContent = '◀';
    }
}

function showSaleDetails(soldInfo, costPerMT, posId) {
    const totalCost = costPerMT * soldInfo.tonnage;
    const profit = soldInfo.totalRevenue - totalCost;
    const profitPerTon = profit / soldInfo.tonnage;

    const costEquation = `${soldInfo.tonnage} MT × $${Math.round(costPerMT).toLocaleString('en-US')}/MT = $${Math.round(totalCost).toLocaleString('en-US')}`;
    const revenueEquation = `${soldInfo.tonnage} MT × $${Math.round(soldInfo.salePrice).toLocaleString('en-US')}/MT = $${Math.round(soldInfo.totalRevenue).toLocaleString('en-US')}`;

    const popup = document.createElement('div');
    popup.className = 'sale-details-popup';
    popup.id = 'saleDetailsPopup';
    popup.innerHTML = `
        <div class="sale-details-content">
            <div class="sale-details-header">
                <span>📋 Sale Details</span>
                <button class="sale-details-close" onclick="closeSaleDetails()">×</button>
            </div>
            <div class="sale-details-body">
                <div class="sale-detail-row">
                    <span class="sale-detail-label">Region:</span>
                    <span class="sale-detail-value">${soldInfo.region}</span>
                </div>
                <div class="sale-detail-row">
                    <span class="sale-detail-label">Tonnage:</span>
                    <span class="sale-detail-value">${soldInfo.tonnage} MT</span>
                </div>
                <div class="sale-detail-row">
                    <span class="sale-detail-label">QP Period:</span>
                    <span class="sale-detail-value" style="color: #fbbf24; font-weight: 700;">M+1</span>
                </div>
                <div class="sale-detail-divider"></div>
                <div class="sale-detail-row">
                    <span class="sale-detail-label">Original Cost:</span>
                    <span class="sale-detail-value price-negative">-$${Math.round(totalCost).toLocaleString('en-US')}</span>
                </div>
                <div style="font-size: 11px; color: #888; padding: 4px 0; text-align: right;">${costEquation}</div>
                <div class="sale-detail-row">
                    <span class="sale-detail-label">Sale Revenue:</span>
                    <span class="sale-detail-value price-positive">+$${Math.round(soldInfo.totalRevenue).toLocaleString('en-US')}</span>
                </div>
                <div style="font-size: 11px; color: #888; padding: 4px 0; text-align: right;">${revenueEquation}</div>
                <div class="sale-detail-divider"></div>
                <div class="sale-detail-row">
                    <span class="sale-detail-label">Projected Profit:</span>
                    <span class="sale-detail-value ${profit >= 0 ? 'price-positive' : 'price-negative'}">${profit >= 0 ? '+' : ''}$${Math.round(profit).toLocaleString('en-US')}</span>
                </div>
                <div class="sale-detail-row">
                    <span class="sale-detail-label">Profit per Ton:</span>
                    <span class="sale-detail-value ${profitPerTon >= 0 ? 'price-positive' : 'price-negative'}">${profitPerTon >= 0 ? '+' : ''}$${Math.round(profitPerTon).toLocaleString('en-US')}/MT</span>
                </div>
                <div class="sale-detail-row">
                    <span class="sale-detail-label">Settlement Turn:</span>
                    <span class="sale-detail-value">${soldInfo.settlementTurn}</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.classList.add('active'), 10);
}

function closeSaleDetails() {
    const popup = document.getElementById('saleDetailsPopup');
    if (popup) {
        popup.classList.remove('active');
        setTimeout(() => popup.remove(), 300);
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    const btn = document.querySelector('.theme-toggle');

    html.setAttribute('data-theme', newTheme);

    if (newTheme === 'light') {
        btn.textContent = '🌙 Dark Mode';
    } else {
        btn.textContent = '☀️ Light Mode';
    }

    localStorage.setItem('theme', newTheme);
}

export { advanceTurn, toggleSidebar, showSaleDetails, closeSaleDetails, toggleTheme };
