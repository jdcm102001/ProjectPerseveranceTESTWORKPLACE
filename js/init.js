/* ==========================================
   APPLICATION INITIALIZATION MODULE
   ========================================== */

// Import core modules
import { GAME_STATE } from './core/game-state.js';
import { TradePanel } from './core/trade-panel.js';
import { advanceTurn, toggleSidebar, toggleTheme, showSaleDetails, closeSaleDetails } from './core/game-controls.js';
import { initCollapsibles, refreshCollapsibles } from './core/collapsible.js';

// Import widget modules
import { MarketsWidget } from './widgets/markets-widget.js';
import { FuturesWidget } from './widgets/futures-widget.js';
import { PositionsWidget } from './widgets/positions-widget.js';
import { MaritimeMapWidget } from './widgets/maritime-map-widget.js';

// Import utility modules
import { WorkflowHints } from './utils/workflow-hints.js';
import { DataValidator } from './utils/data-validator.js';

// Import drag & drop modules
import {
    handleWidgetDragStart,
    handleWidgetDragEnd,
    handlePanelDragOver,
    handlePanelDragLeave,
    handlePanelDrop,
    createWidgetContent,
    updateWidgetElevation
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
   EXPOSE TO WINDOW IMMEDIATELY (Before HTML parsing completes)
   ========================================== */

// Make functions globally available for inline event handlers BEFORE DOMContentLoaded
window.GAME_STATE = GAME_STATE;
window.TradePanel = TradePanel;
window.FuturesWidget = FuturesWidget;
window.advanceTurn = advanceTurn;
window.toggleSidebar = toggleSidebar;
window.toggleTheme = toggleTheme;
window.showSaleDetails = showSaleDetails;
window.closeSaleDetails = closeSaleDetails;
window.closeWidget = closeWidget;
window.updateWidgetElevation = updateWidgetElevation;

// Save/Load convenience functions
window.saveGame = () => GAME_STATE.saveGame();
window.loadGame = () => GAME_STATE.loadGame();
window.exportGame = () => GAME_STATE.exportGameData();
window.deleteSave = () => GAME_STATE.deleteSave();

/* ==========================================
   INITIALIZATION
   ========================================== */

document.addEventListener('DOMContentLoaded', async function() {
    // CRITICAL: Wait for async scenario loading to complete
    console.log('🎮 Starting game initialization...');
    await GAME_STATE.init();
    console.log('✅ GAME_STATE initialized, currentMonthData:', GAME_STATE.currentMonthData);

    // Validate all month data (Phase 5: Data validation)
    console.log('🔍 Validating month data...');
    const validation = DataValidator.validateAllMonths();
    if (!validation.valid) {
        console.warn('⚠️ Month data validation found issues:', validation);
    } else {
        console.log('✅ All month data validated successfully');
    }

    // Now safe to initialize widgets (they depend on month data)
    console.log('📊 Initializing widgets...');
    MarketsWidget.init();
    FuturesWidget.init();
    TradePanel.init();
    console.log('✅ Widgets initialized');

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

    // Populate pre-loaded widget content
    async function populateInitialWidgets() {
        // Panel A: Positions and Futures
        const panelA = document.getElementById('panelA');
        const panelAContent = panelA.querySelector('.panel-content');

        const positionsContent = await createWidgetContent('Positions', true);
        panelAContent.appendChild(positionsContent);

        const futuresContent = await createWidgetContent('Futures', false);
        panelAContent.appendChild(futuresContent);

        // Panel B: Markets
        const panelB = document.getElementById('panelB');
        const panelBContent = panelB.querySelector('.panel-content');

        const marketsContent = await createWidgetContent('Markets', true);
        panelBContent.appendChild(marketsContent);
    }

    populateInitialWidgets();

    // Initialize collapsible sections after widgets load
    setTimeout(() => {
        initCollapsibles();
        updateWidgetElevation(); // Update elevation based on initial game state
        WorkflowHints.checkAndShowHints(); // Show workflow hints if applicable
    }, 500);

    // Attach event listeners for UI controls
    document.getElementById('nextTurnBtn')?.addEventListener('click', advanceTurn);
    document.getElementById('sidebarToggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
    document.getElementById('closeSaleDetailsBtn')?.addEventListener('click', closeSaleDetails);

    // Key Metrics toggle functionality
    document.getElementById('keyMetricsToggle')?.addEventListener('click', function() {
        const expanded = document.getElementById('keyMetricsExpanded');
        const button = this;

        if (expanded.style.display === 'none' || expanded.style.display === '') {
            expanded.style.display = 'flex';
            button.textContent = '📊 Key Metrics ▲';
            button.classList.add('expanded');
            sessionStorage.setItem('keyMetricsExpanded', 'true');
        } else {
            expanded.style.display = 'none';
            button.textContent = '📊 Key Metrics ▼';
            button.classList.remove('expanded');
            sessionStorage.setItem('keyMetricsExpanded', 'false');
        }
    });

    // Restore key metrics expanded state on load
    if (sessionStorage.getItem('keyMetricsExpanded') === 'true') {
        const expanded = document.getElementById('keyMetricsExpanded');
        const button = document.getElementById('keyMetricsToggle');
        if (expanded && button) {
            expanded.style.display = 'flex';
            button.textContent = '📊 Key Metrics ▲';
            button.classList.add('expanded');
        }
    }

    // Attach event listeners for close buttons (using event delegation)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-btn')) {
            const panel = e.target.dataset.closePanel;
            const widget = e.target.dataset.closeWidget;
            if (panel && widget) {
                closeWidget(panel, widget);
            }
        }

        // Handle buy button clicks
        if (e.target.classList.contains('buy-btn') && !e.target.disabled) {
            const supplier = e.target.dataset.supplier;
            const port = e.target.dataset.port;
            const minMT = parseFloat(e.target.dataset.min);
            const maxMT = parseFloat(e.target.dataset.max);
            const basis = e.target.dataset.basis;
            const premium = parseFloat(e.target.dataset.premium);
            const isLTA = e.target.dataset.islta === 'true';

            TradePanel.openBuy(supplier, port, minMT, maxMT, basis, premium, isLTA);
        }

        // Handle sell button clicks
        if (e.target.classList.contains('sell-btn') && !e.target.disabled) {
            const buyer = e.target.dataset.buyer;
            const dest = e.target.dataset.dest;
            const minMT = parseFloat(e.target.dataset.min);
            const maxMT = parseFloat(e.target.dataset.max);
            const exchange = e.target.dataset.exchange;
            const premium = parseFloat(e.target.dataset.premium);

            TradePanel.openSell(buyer, dest, minMT, maxMT, exchange, premium);
        }
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const html = document.documentElement;
    const btn = document.getElementById('themeToggleBtn');

    html.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'light' && btn) {
        btn.textContent = '🌙 Dark Mode';
    }
});
