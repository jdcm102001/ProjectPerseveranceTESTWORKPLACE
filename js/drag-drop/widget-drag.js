import { panelState, dragState } from './drag-state.js';
import { redistributePanels, applyPanelLayout } from './panel-resize.js';
import { setupTabDropZones, switchTab, closeWidget, handleTabDragStart, handleTabDragEnd } from './tab-drag.js';
import { MarketsWidget } from '../widgets/markets-widget.js';
import { PositionsWidget } from '../widgets/positions-widget.js';
import { FuturesWidget } from '../widgets/futures-widget.js';

/* ==========================================
   WIDGET DRAG & DROP HANDLERS
   ========================================== */

function handleWidgetDragStart(e) {
    dragState.draggedWidget = e.target.dataset.widget;
    e.dataTransfer.effectAllowed = 'move';

    const preview = document.getElementById('dragPreview');
    preview.textContent = dragState.draggedWidget;
    preview.style.display = 'block';

    showNextEmptyPanelAsDropZone();
}

function handleWidgetDragEnd(e) {
    const preview = document.getElementById('dragPreview');
    preview.style.display = 'none';
    dragState.draggedWidget = null;
    hideEmptyPanelDropZones();
}

function handlePanelDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
    return false;
}

function handlePanelDragLeave(e) {
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.remove('drag-over');
    }
}

function handlePanelDrop(e) {
    e.stopPropagation();
    e.preventDefault();

    const zone = e.currentTarget;
    zone.classList.remove('drag-over');
    zone.classList.remove('drop-zone-highlight');

    const panelId = zone.dataset.panel;

    if (!dragState.draggedWidget) return false;

    // CHECK: Is this widget already open in ANY panel?
    const allPanels = ['A', 'B', 'C'];
    for (let p of allPanels) {
        if (panelState[p].includes(dragState.draggedWidget)) {
            // Widget already exists in a panel
            alert(`❌ "${dragState.draggedWidget}" is already open in Panel ${p}.\n\nClose it first before opening elsewhere.`);
            hideEmptyPanelDropZones();
            return false;
        }
    }

    addWidgetToPanel(panelId, dragState.draggedWidget);
    hideEmptyPanelDropZones();
    return false;
}

/* ==========================================
   DROP ZONE MANAGEMENT
   ========================================== */

function showNextEmptyPanelAsDropZone() {
    const emptyPanels = ['A', 'B', 'C'].filter(id => panelState[id].length === 0);

    if (emptyPanels.length > 0) {
        const nextEmpty = emptyPanels[0];
        const zone = document.getElementById('panel' + nextEmpty);

        zone.classList.remove('empty');
        zone.classList.add('drop-zone-highlight');
        zone.style.display = 'flex';
        zone.style.flex = '1';
        zone.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: #888; font-size: 14px; border: 2px dashed #4a9eff; background: #1a2a3a; pointer-events: none;">Drop widget here</div>';

        updateDividersForDropZone();
    }
}

function hideEmptyPanelDropZones() {
    ['A', 'B', 'C'].forEach(panelId => {
        if (panelState[panelId].length === 0) {
            const zone = document.getElementById('panel' + panelId);
            if (zone) {
                zone.classList.add('empty');
                zone.classList.remove('drop-zone-highlight');
                zone.style.display = 'none';
                zone.style.flex = '0';
                zone.innerHTML = '';
            }
        }
    });

    applyPanelLayout();
}

function updateDividersForDropZone() {
    const dividerAB = document.querySelector('[data-divider="A-B"]');
    const dividerBC = document.querySelector('[data-divider="B-C"]');

    const hasA = panelState.A.length > 0;
    const hasB = panelState.B.length > 0;
    const hasC = panelState.C.length > 0;

    const dropZoneA = document.getElementById('panelA').classList.contains('drop-zone-highlight');
    const dropZoneB = document.getElementById('panelB').classList.contains('drop-zone-highlight');
    const dropZoneC = document.getElementById('panelC').classList.contains('drop-zone-highlight');

    dividerAB.style.display = ((hasA || dropZoneA) && (hasB || dropZoneB)) ? '' : 'none';
    dividerBC.style.display = ((hasB || dropZoneB) && (hasC || dropZoneC)) ? '' : 'none';
}

/* ==========================================
   WIDGET PANEL MANAGEMENT
   ========================================== */

async function addWidgetToPanel(panelId, widgetName) {
    const zone = document.getElementById('panel' + panelId);
    panelState[panelId].push(widgetName);

    if (panelState[panelId].length === 1) {
        zone.classList.remove('empty');
        zone.classList.remove('drop-zone-highlight');
        zone.style.display = 'flex';
        zone.innerHTML = '';

        const container = document.createElement('div');
        container.className = 'panel-container';

        const header = document.createElement('div');
        header.className = 'panel-header';

        const content = document.createElement('div');
        content.className = 'panel-content';

        container.appendChild(header);
        container.appendChild(content);
        zone.appendChild(container);

        redistributePanels();
    }

    const header = zone.querySelector('.panel-header');
    const tab = createTab(panelId, widgetName, panelState[panelId].length === 1);
    header.appendChild(tab);

    const content = zone.querySelector('.panel-content');
    const widgetContent = await createWidgetContent(widgetName, panelState[panelId].length === 1);
    content.appendChild(widgetContent);

    setupTabDropZones();
}

function createTab(panelId, widgetName, isActive) {
    const tab = document.createElement('div');
    tab.className = 'panel-tab' + (isActive ? ' active' : '');
    tab.dataset.widget = widgetName;
    tab.dataset.sourcePanel = panelId;
    tab.draggable = true;

    tab.onclick = (e) => {
        if (e.target.classList.contains('close-btn')) return;
        switchTab(panelId, widgetName);
    };

    tab.addEventListener('dragstart', handleTabDragStart);
    tab.addEventListener('dragend', handleTabDragEnd);

    const name = document.createElement('span');
    name.className = 'panel-tab-name';
    name.textContent = widgetName;

    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '×';
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        closeWidget(panelId, widgetName);
    };

    tab.appendChild(name);
    tab.appendChild(closeBtn);
    return tab;
}

async function createWidgetContent(widgetName, isActive) {
    const content = document.createElement('div');

    // Apply elevation level based on widget type
    let elevationClass = 'widget-elevation-3'; // Default: Supporting

    if (widgetName === 'Positions') {
        elevationClass = 'widget-elevation-1'; // Critical - always visible
    } else if (widgetName === 'Markets' || widgetName === 'Futures') {
        elevationClass = 'widget-elevation-2'; // Important - contextual (will be dynamically updated)
    }

    content.className = 'widget-content' + (isActive ? ' active' : '') + ' ' + elevationClass;
    content.dataset.widget = widgetName;

    if (widgetName === 'Markets') {
        content.innerHTML = `
            <div class="markets-widget-content">
                <div class="section-title">🔵 This Month's Supplier</div>
                <table class="markets-table" id="suppliersTable">
                    <thead>
                        <tr>
                            <th>SELLER</th>
                            <th>AVAILABLE</th>
                            <th>PRICING & PREMIUM</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody id="suppliersTableBody"></tbody>
                </table>

                <div class="section-title">🟢 This Month's Buyer</div>
                <table class="markets-table" id="buyersTable">
                    <thead>
                        <tr>
                            <th>BUYER</th>
                            <th>DEMAND</th>
                            <th>PRICING & PREMIUM</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody id="buyersTableBody"></tbody>
                </table>
            </div>
        `;

        setTimeout(() => {
            MarketsWidget.init();
        }, 100);

        return content;
    }

    if (widgetName === 'Positions') {
        content.innerHTML = `
            <div class="positions-widget-content" style="padding: 15px;">
                <!-- Maritime Map Section -->
                <div class="maritime-map-container">
                    <div id="maritimeMap"></div>
                    <div class="maritime-map-loading">
                        <div class="maritime-map-loading-icon">🚢</div>
                        <div class="maritime-map-loading-text">Loading maritime map...</div>
                    </div>
                    <div class="maritime-map-error hidden">
                        <div class="maritime-map-error-icon">⚠️</div>
                        <div class="maritime-map-error-title">Map Error</div>
                        <div class="maritime-map-error-message">Failed to load maritime map</div>
                    </div>
                    <div class="maritime-map-header">
                        <div class="maritime-map-header-icon">🚢</div>
                        <div class="maritime-map-header-text">
                            <div class="maritime-map-header-title">Active Shipments</div>
                            <div class="maritime-map-header-value" id="activeShipmentsCount">0</div>
                        </div>
                    </div>
                    <div class="maritime-map-legend">
                        <div class="maritime-map-legend-title">Port Types</div>
                        <div class="maritime-map-legend-item">
                            <div class="port-marker-circle" style="background: #00FF88; box-shadow: 0 0 8px #00FF88;"></div>
                            <div class="maritime-map-legend-label">Hub Ports</div>
                        </div>
                        <div class="maritime-map-legend-item">
                            <div class="port-marker-circle" style="background: #F59E0B;"></div>
                            <div class="maritime-map-legend-label">Parity Ports</div>
                        </div>
                        <div class="maritime-map-legend-item">
                            <div class="port-marker-triangle" style="border-bottom-color: #EF4444;"></div>
                            <div class="maritime-map-legend-label">Seller Ports</div>
                        </div>
                    </div>
                    <div class="maritime-map-empty">
                        <div class="maritime-map-empty-icon">🌊</div>
                        <div class="maritime-map-empty-text">No active shipments</div>
                    </div>
                </div>

                <!-- Physical Positions Table -->
                <div class="section-title">📦 Physical Positions</div>
                <div id="positionsContainer"></div>
            </div>
        `;

        setTimeout(() => {
            PositionsWidget.init();
        }, 100);

        return content;
    }

    if (widgetName === 'Futures') {
        content.innerHTML = `
            <div class="futures-widget-content" style="position: relative;">
                <!-- Help Icon -->
                <div class="help-icon" onclick="FuturesWidget.toggleHelp()" style="position: absolute; top: 0; right: 0; z-index: 10;">❓</div>

                <!-- Help Tooltip (hidden by default) -->
                <div id="futuresHelpTooltip" class="futures-help-tooltip" style="display: none;"></div>

                <!-- Summary Stats -->
                <div class="match-stats" style="margin-bottom: 20px;">
                    <div class="match-stat">
                        <div class="match-stat-label">Unrealized P&L</div>
                        <div class="match-stat-value" id="futuresUnrealizedPL">$0</div>
                    </div>
                    <div class="match-stat">
                        <div class="match-stat-label">Margin Used</div>
                        <div class="match-stat-value" id="futuresMarginUsed">$0 / $100K</div>
                    </div>
                </div>

                <!-- Toggle Buttons -->
                <div class="futures-toggle-buttons" style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button class="futures-toggle-btn active" data-view="LME" onclick="FuturesWidget.setView('LME')">
                        LME
                    </button>
                    <button class="futures-toggle-btn" data-view="COMEX" onclick="FuturesWidget.setView('COMEX')">
                        COMEX
                    </button>
                    <button class="futures-toggle-btn" data-view="BOTH" onclick="FuturesWidget.setView('BOTH')">
                        BOTH
                    </button>
                </div>

                <!-- Futures Term Structure Graph -->
                <div class="futures-graph-container" style="background: rgba(30, 30, 30, 0.5); border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                    <div class="section-title" style="margin-bottom: 15px;">📈 Futures Term Structure</div>
                    <canvas id="futuresChart" style="max-height: 300px;"></canvas>
                </div>

                <!-- Contract Specifications Info (Collapsible) -->
                <div style="margin-bottom: 20px;">
                    <div class="section-title" style="font-weight: 600; margin-bottom: 10px; color: #3b82f6; padding: 10px; background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6;">
                        📊 Contract Specifications
                    </div>
                    <div class="info-box" style="background: rgba(59, 130, 246, 0.05); border-left: 3px solid #3b82f6; padding: 15px; margin-bottom: 0;">
                        <div style="font-size: 12px; line-height: 1.8; color: #e0e0e0;">
                            <strong>LME:</strong> 25 MT per contract<br>
                            <strong>COMEX:</strong> 11.34 MT per contract (25,000 lbs)<br>
                            <em style="color: #888;">Note: Margin = $9,000 per contract | Fees = $25 open + $25 close</em>
                        </div>
                    </div>
                </div>

                <!-- Available Contracts -->
                <div class="section-title">📊 Available Contracts</div>
                <div id="futuresAvailableTable"></div>

                <!-- Open Positions -->
                <div class="section-title" style="margin-top: 30px;">📈 Open Positions</div>
                <div id="futuresPositionsTable"></div>

                <!-- Margin Breakdown -->
                <div class="section-title" style="margin-top: 30px;">💰 Margin Breakdown</div>
                <div id="futuresMarginBreakdown"></div>
            </div>
        `;

        setTimeout(() => {
            FuturesWidget.render();
            FuturesWidget.renderGraph();
        }, 100);

        return content;
    }

    content.innerHTML = `<div style="padding: 20px; color: #666;">${widgetName} widget content</div>`;
    return content;
}

/* ==========================================
   DYNAMIC ELEVATION MANAGEMENT
   ========================================== */

/**
 * Updates widget elevation levels based on current game state
 * Called after state changes (trades, turn advancement, etc.)
 */
function updateWidgetElevation() {
    // Get GAME_STATE from window (already exposed globally)
    const state = window.GAME_STATE?.state;
    if (!state) return;

    // Calculate buying power
    const buyingPower = state.practiceFunds + (state.locLimit - state.locUsed);

    // Calculate price exposure
    const exposureData = window.GAME_STATE?.calculatePriceExposure?.();
    const exposurePercentage = exposureData?.exposurePercentage || 0;

    // Find Markets widget and update elevation
    const marketsWidget = document.querySelector('[data-widget="Markets"].widget-content');
    if (marketsWidget) {
        marketsWidget.classList.remove('widget-elevation-2', 'widget-elevation-3');
        if (buyingPower > 10000) {
            marketsWidget.classList.add('widget-elevation-2'); // Important - you can trade
        } else {
            marketsWidget.classList.add('widget-elevation-3'); // Supporting - limited capital
        }
    }

    // Find Futures widget and update elevation
    const futuresWidget = document.querySelector('[data-widget="Futures"].widget-content');
    if (futuresWidget) {
        const hasOpenFutures = state.futuresPositions?.some(p => p.status === 'OPEN') || false;
        futuresWidget.classList.remove('widget-elevation-2', 'widget-elevation-3');
        if (hasOpenFutures || exposurePercentage > 20) {
            futuresWidget.classList.add('widget-elevation-2'); // Important - active hedging needed
        } else {
            futuresWidget.classList.add('widget-elevation-3'); // Supporting - no urgent need
        }
    }
}

// Export functions
export {
    handleWidgetDragStart,
    handleWidgetDragEnd,
    handlePanelDragOver,
    handlePanelDragLeave,
    handlePanelDrop,
    showNextEmptyPanelAsDropZone,
    hideEmptyPanelDropZones,
    updateDividersForDropZone,
    addWidgetToPanel,
    createTab,
    createWidgetContent,
    updateWidgetElevation
};
