import { panelState, dragState } from './drag-state.js';
import { redistributePanels } from './panel-resize.js';
import { createTab } from './widget-drag.js';

/* ==========================================
   TAB MANAGEMENT
   ========================================== */

function switchTab(panelId, widgetName) {
    const zone = document.getElementById('panel' + panelId);
    if (!zone) return;

    zone.querySelectorAll('.panel-tab').forEach(tab => {
        if (tab.dataset.widget === widgetName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    zone.querySelectorAll('.widget-content').forEach(content => {
        if (content.dataset.widget === widgetName) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

function closeWidget(panelId, widgetName) {
    const zone = document.getElementById('panel' + panelId);

    const index = panelState[panelId].indexOf(widgetName);
    if (index > -1) {
        panelState[panelId].splice(index, 1);
    }

    if (panelState[panelId].length === 0) {
        zone.innerHTML = '';
        zone.classList.add('empty');
        zone.style.display = 'none';
        redistributePanels();
        return;
    }

    const tab = zone.querySelector(`.panel-tab[data-widget="${widgetName}"]`);
    const content = zone.querySelector(`.widget-content[data-widget="${widgetName}"]`);

    const wasActive = tab.classList.contains('active');

    tab.remove();
    content.remove();

    if (wasActive && panelState[panelId].length > 0) {
        switchTab(panelId, panelState[panelId][0]);
    }
}

/* ==========================================
   TAB DRAG & DROP (BETWEEN PANELS)
   ========================================== */

function handleTabDragStart(e) {
    dragState.draggedTab = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', dragState.draggedTab.dataset.widget);

    dragState.draggedTab.style.opacity = '0.4';

    const preview = document.getElementById('dragPreview');
    preview.textContent = dragState.draggedTab.dataset.widget + ' (tab)';
    preview.style.display = 'block';
}

function handleTabDragEnd(e) {
    if (dragState.draggedTab) {
        dragState.draggedTab.style.opacity = '';
    }
    dragState.draggedTab = null;

    const preview = document.getElementById('dragPreview');
    preview.style.display = 'none';

    document.querySelectorAll('.panel-header').forEach(header => {
        header.classList.remove('tab-drag-over');
    });
}

function handleTabHeaderDragOver(e) {
    if (!dragState.draggedTab) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('tab-drag-over');
    return false;
}

function handleTabHeaderDragLeave(e) {
    if (!dragState.draggedTab) return;

    const header = e.currentTarget;
    if (!header.contains(e.relatedTarget)) {
        header.classList.remove('tab-drag-over');
    }
}

function handleTabHeaderDrop(e) {
    if (!dragState.draggedTab) return;

    e.stopPropagation();
    e.preventDefault();

    const targetHeader = e.currentTarget;
    const targetPanel = targetHeader.closest('.panel-zone');
    const targetPanelId = targetPanel.dataset.panel;
    const sourcePanel = dragState.draggedTab.dataset.sourcePanel;
    const widgetName = dragState.draggedTab.dataset.widget;

    targetHeader.classList.remove('tab-drag-over');

    if (sourcePanel === targetPanelId) return false;

    if (panelState[targetPanelId].includes(widgetName)) {
        alert(`${widgetName} is already in Panel ${targetPanelId}`);
        return false;
    }

    moveTabBetweenPanels(sourcePanel, targetPanelId, widgetName);
    return false;
}

/* ==========================================
   TAB MOVEMENT
   ========================================== */

function moveTabBetweenPanels(sourcePanelId, targetPanelId, widgetName) {
    const sourceIndex = panelState[sourcePanelId].indexOf(widgetName);
    if (sourceIndex > -1) {
        panelState[sourcePanelId].splice(sourceIndex, 1);
    }
    panelState[targetPanelId].push(widgetName);

    const sourceZone = document.getElementById('panel' + sourcePanelId);
    const widgetContent = sourceZone.querySelector(`.widget-content[data-widget="${widgetName}"]`);

    if (!widgetContent) return;

    const contentClone = widgetContent.cloneNode(true);

    const sourceTab = sourceZone.querySelector(`.panel-tab[data-widget="${widgetName}"]`);
    if (sourceTab) sourceTab.remove();
    widgetContent.remove();

    if (panelState[sourcePanelId].length === 0) {
        sourceZone.innerHTML = '';
        sourceZone.classList.add('empty');
        sourceZone.style.display = 'none';
        redistributePanels();
    } else {
        const remainingTabs = sourceZone.querySelectorAll('.panel-tab');
        const hasActive = Array.from(remainingTabs).some(tab => tab.classList.contains('active'));
        if (!hasActive && remainingTabs.length > 0) {
            switchTab(sourcePanelId, panelState[sourcePanelId][0]);
        }
    }

    const targetZone = document.getElementById('panel' + targetPanelId);

    if (panelState[targetPanelId].length === 1) {
        targetZone.classList.remove('empty');
        targetZone.style.display = 'flex';
        targetZone.innerHTML = '';

        const container = document.createElement('div');
        container.className = 'panel-container';

        const header = document.createElement('div');
        header.className = 'panel-header';

        const content = document.createElement('div');
        content.className = 'panel-content';

        container.appendChild(header);
        container.appendChild(content);
        targetZone.appendChild(container);

        redistributePanels();
    }

    const targetHeader = targetZone.querySelector('.panel-header');
    const newTab = createTab(targetPanelId, widgetName, false);
    targetHeader.appendChild(newTab);

    const targetContent = targetZone.querySelector('.panel-content');
    contentClone.classList.remove('active');
    targetContent.appendChild(contentClone);

    setupTabDropZones();
}

/* ==========================================
   TAB SETUP
   ========================================== */

function setupTabDropZones() {
    document.querySelectorAll('.panel-header').forEach(header => {
        header.removeEventListener('dragover', handleTabHeaderDragOver);
        header.removeEventListener('dragleave', handleTabHeaderDragLeave);
        header.removeEventListener('drop', handleTabHeaderDrop);

        header.addEventListener('dragover', handleTabHeaderDragOver);
        header.addEventListener('dragleave', handleTabHeaderDragLeave);
        header.addEventListener('drop', handleTabHeaderDrop);
    });
}

function setupInitialTabs() {
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.draggable = true;

        const panel = tab.closest('.panel-zone');
        if (panel) {
            const panelId = panel.dataset.panel;
            tab.dataset.sourcePanel = panelId;

            const widgetName = tab.dataset.widget;
            tab.onclick = (e) => {
                if (e.target.classList.contains('close-btn')) return;
                switchTab(panelId, widgetName);
            };
        }

        tab.addEventListener('dragstart', handleTabDragStart);
        tab.addEventListener('dragend', handleTabDragEnd);
    });
}

// Export functions
export {
    switchTab,
    closeWidget,
    handleTabDragStart,
    handleTabDragEnd,
    handleTabHeaderDragOver,
    handleTabHeaderDragLeave,
    handleTabHeaderDrop,
    moveTabBetweenPanels,
    setupTabDropZones,
    setupInitialTabs
};
