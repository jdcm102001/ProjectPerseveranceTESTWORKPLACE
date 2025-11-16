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

    if (panelState[panelId].includes(dragState.draggedWidget)) {
        alert(`${dragState.draggedWidget} is already in Panel ${panelId}`);
        hideEmptyPanelDropZones();
        return false;
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
    content.className = 'widget-content' + (isActive ? ' active' : '');
    content.dataset.widget = widgetName;

    if (widgetName === 'Markets') {
        content.innerHTML = `
            <div class="markets-widget-content">
                <div class="section-title">🔵 Suppliers - Buy Copper</div>
                <table class="markets-table">
                    <thead>
                        <tr>
                            <th>SELLER</th>
                            <th>AVAILABLE</th>
                            <th>PRICING BASIS</th>
                            <th>PREMIUM</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody id="suppliersTableBody"></tbody>
                </table>

                <div class="section-title">🟢 Buyers - Sell Copper</div>
                <table class="markets-table">
                    <thead>
                        <tr>
                            <th>BUYER</th>
                            <th>DEMAND</th>
                            <th>PORT</th>
                            <th>EXCHANGE</th>
                            <th>QP</th>
                            <th>PREMIUM</th>
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
            <div class="futures-widget-content">
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

                <!-- Available Contracts -->
                <div class="section-title">📊 Available Contracts</div>
                <div id="futuresAvailableTable"></div>

                <!-- Open Positions -->
                <div class="section-title" style="margin-top: 30px;">📈 Open Positions</div>
                <div id="futuresPositionsTable"></div>
            </div>
        `;

        setTimeout(() => {
            FuturesWidget.render();
        }, 100);

        return content;
    }

    content.innerHTML = `<div style="padding: 20px; color: #666;">${widgetName} widget content</div>`;
    return content;
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
    createWidgetContent
};
