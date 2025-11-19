import { panelState, panelFlexValues, dragState } from './drag-state.js';

/* ==========================================
   PANEL RESIZING
   ========================================== */

function handleDividerMouseDown(e) {
    e.preventDefault();
    dragState.resizingDivider = e.currentTarget;
    dragState.resizeStartX = e.clientX;

    const dividerType = dragState.resizingDivider.dataset.divider;
    const [leftPanel, rightPanel] = dividerType.split('-');

    const leftElement = document.getElementById('panel' + leftPanel);
    const rightElement = document.getElementById('panel' + rightPanel);

    dragState.resizeStartData = {
        leftPanel: leftPanel,
        rightPanel: rightPanel,
        leftFlex: panelFlexValues[leftPanel],
        rightFlex: panelFlexValues[rightPanel],
        leftWidth: leftElement.offsetWidth,
        rightWidth: rightElement.offsetWidth
    };

    dragState.resizingDivider.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
}

function handleDividerMouseMove(e) {
    if (!dragState.resizingDivider) return;

    const deltaX = e.clientX - dragState.resizeStartX;
    const totalWidth = dragState.resizeStartData.leftWidth + dragState.resizeStartData.rightWidth;
    const totalFlex = dragState.resizeStartData.leftFlex + dragState.resizeStartData.rightFlex;

    const newLeftWidth = dragState.resizeStartData.leftWidth + deltaX;
    const newRightWidth = dragState.resizeStartData.rightWidth - deltaX;

    if (newLeftWidth < 100 || newRightWidth < 100) return;

    const leftRatio = newLeftWidth / totalWidth;
    const rightRatio = newRightWidth / totalWidth;

    panelFlexValues[dragState.resizeStartData.leftPanel] = leftRatio * totalFlex;
    panelFlexValues[dragState.resizeStartData.rightPanel] = rightRatio * totalFlex;

    applyPanelLayout();
}

function handleDividerMouseUp(e) {
    if (!dragState.resizingDivider) return;

    dragState.resizingDivider.classList.remove('dragging');
    dragState.resizingDivider = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
}

/* ==========================================
   PANEL MANAGEMENT
   ========================================== */

function redistributePanels() {
    const activePanels = ['A', 'B', 'C'].filter(id => panelState[id].length > 0);

    panelFlexValues.A = 0;
    panelFlexValues.B = 0;
    panelFlexValues.C = 0;

    activePanels.forEach(id => {
        panelFlexValues[id] = 1;
    });

    applyPanelLayout();
}

function applyPanelLayout() {
    const panelA = document.getElementById('panelA');
    const panelB = document.getElementById('panelB');
    const panelC = document.getElementById('panelC');
    const dividerAB = document.querySelector('[data-divider="A-B"]');
    const dividerBC = document.querySelector('[data-divider="B-C"]');

    const hasA = panelState.A.length > 0;
    const hasB = panelState.B.length > 0;
    const hasC = panelState.C.length > 0;

    panelA.style.flex = panelFlexValues.A;
    panelB.style.flex = panelFlexValues.B;
    panelC.style.flex = panelFlexValues.C;

    panelA.style.display = hasA ? 'flex' : 'none';
    panelB.style.display = hasB ? 'flex' : 'none';
    panelC.style.display = hasC ? 'flex' : 'none';

    dividerAB.style.display = (hasA && hasB) ? '' : 'none';
    dividerBC.style.display = (hasB && hasC) ? '' : 'none';

    // Dispatch event for map resizing
    window.dispatchEvent(new CustomEvent('panel-resized'));
}

function updateDragPreviewPosition(e) {
    if (!dragState.draggedWidget && !dragState.draggedTab) return;
    const preview = document.getElementById('dragPreview');
    preview.style.left = e.pageX + 10 + 'px';
    preview.style.top = e.pageY + 10 + 'px';
}

// Export functions
export {
    handleDividerMouseDown,
    handleDividerMouseMove,
    handleDividerMouseUp,
    redistributePanels,
    applyPanelLayout,
    updateDragPreviewPosition
};
