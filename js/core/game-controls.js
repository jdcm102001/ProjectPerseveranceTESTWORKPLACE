import { GAME_STATE } from './game-state.js';
import { PositionsWidget } from '../widgets/positions-widget.js';
import { MarketsWidget } from '../widgets/markets-widget.js';
import { FuturesWidget } from '../widgets/futures-widget.js';

function advanceTurn() {
    // Determine what period we're advancing to
    const currentPeriodName = GAME_STATE.periodName;
    const nextTurn = GAME_STATE.currentTurn + 1;

    // Build confirmation message
    let confirmMessage = `Advance to next period?\n\n`;
    confirmMessage += `Current: Turn ${GAME_STATE.currentTurn}/12 (${GAME_STATE.currentMonthName} - ${currentPeriodName})\n`;
    confirmMessage += `Next: Turn ${nextTurn}/12\n\n`;
    confirmMessage += `This will:\n`;

    // Check if we'll cross month boundary
    if (GAME_STATE.currentPeriod === 2) {
        confirmMessage += `- Move to ${GAME_STATE.currentMonth === 1 ? 'February' : GAME_STATE.currentMonth === 2 ? 'March' : GAME_STATE.currentMonth === 3 ? 'April' : GAME_STATE.currentMonth === 4 ? 'May' : GAME_STATE.currentMonth === 5 ? 'June' : 'July'} - Early\n`;
        confirmMessage += `- Reset monthly limits\n`;
    } else {
        confirmMessage += `- Move to ${GAME_STATE.currentMonthName} - Late\n`;
    }

    // Show LOC interest charge (happens EVERY period now)
    if (GAME_STATE.locInterestNextPeriod > 0) {
        confirmMessage += `- Charge LOC interest: $${Math.round(GAME_STATE.locInterestNextPeriod).toLocaleString('en-US')}\n`;
    }

    confirmMessage += `- Update position statuses\n`;
    confirmMessage += `- Process settlements\n`;
    confirmMessage += `- Update futures prices`;

    if (!confirm(confirmMessage)) {
        return;
    }

    // Call the new period advancement system
    GAME_STATE.advancePeriod();

    // Refresh all widgets
    MarketsWidget.init();
    PositionsWidget.render();
    FuturesWidget.render();
    FuturesWidget.renderGraph();  // Re-render graph with new term structure

    // Show advancement summary
    const arrivedCount = GAME_STATE.physicalPositions.filter(p => p.status === 'ARRIVED').length;
    let message = `✅ Advanced to Turn ${GAME_STATE.currentTurn}/12\n`;
    message += `${GAME_STATE.currentMonthName} - ${GAME_STATE.periodName}\n\n`;

    if (arrivedCount > 0) {
        message += `📦 ${arrivedCount} position(s) arrived\n`;
    }

    alert(message);
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
