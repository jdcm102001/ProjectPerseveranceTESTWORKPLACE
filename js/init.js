/* ==========================================
   APPLICATION INITIALIZATION MODULE
   ========================================== */

// Import core modules
import { GAME_STATE } from './core/game-state.js';
import { TradePanel } from './core/trade-panel.js';
import { advanceTurn, toggleSidebar, toggleTheme, showSaleDetails, closeSaleDetails } from './core/game-controls.js';

// Import widget modules
import { MarketsWidget } from './widgets/markets-widget.js';

// Import drag & drop modules
import {
    handleWidgetDragStart,
    handleWidgetDragEnd,
    handlePanelDragOver,
    handlePanelDragLeave,
    handlePanelDrop
} from './drag-drop/widget-drag.js';

import {
    handleDividerMouseDown,
    handleDividerMouseMove,
    handleDividerMouseUp,
    updateDragPreviewPosition
} from './drag-drop/panel-resize.js';

import {
    setupInitialTabs,
    setupTabDropZones,
    closeWidget
} from './drag-drop/tab-drag.js';

/* ==========================================
   INITIALIZATION
   ========================================== */

document.addEventListener('DOMContentLoaded', function() {
    GAME_STATE.init();
    MarketsWidget.init();
    TradePanel.init();

    // Setup drag and drop
    document.querySelectorAll('.widget-item').forEach(item => {
        item.addEventListener('dragstart', handleWidgetDragStart);
        item.addEventListener('dragend', handleWidgetDragEnd);
    });

    document.querySelectorAll('.panel-zone').forEach(zone => {
        zone.addEventListener('dragover', handlePanelDragOver);
        zone.addEventListener('dragleave', handlePanelDragLeave);
        zone.addEventListener('drop', handlePanelDrop);
    });

    document.querySelectorAll('.panel-divider').forEach(divider => {
        divider.addEventListener('mousedown', handleDividerMouseDown);
    });

    document.addEventListener('mousemove', handleDividerMouseMove);
    document.addEventListener('mouseup', handleDividerMouseUp);
    document.addEventListener('dragover', updateDragPreviewPosition);

    setupInitialTabs();
    setupTabDropZones();

    // Attach event listeners for UI controls
    document.getElementById('nextTurnBtn')?.addEventListener('click', advanceTurn);
    document.getElementById('sidebarToggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
    document.getElementById('closeSaleDetailsBtn')?.addEventListener('click', closeSaleDetails);

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const html = document.documentElement;
    const btn = document.getElementById('themeToggleBtn');

    html.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'light' && btn) {
        btn.textContent = '🌙 Dark Mode';
    }

    // Make functions globally available for inline event handlers (trade panels, close buttons, etc.)
    window.GAME_STATE = GAME_STATE;
    window.TradePanel = TradePanel;
    window.advanceTurn = advanceTurn;
    window.toggleSidebar = toggleSidebar;
    window.toggleTheme = toggleTheme;
    window.showSaleDetails = showSaleDetails;
    window.closeSaleDetails = closeSaleDetails;
    window.closeWidget = closeWidget;
});
