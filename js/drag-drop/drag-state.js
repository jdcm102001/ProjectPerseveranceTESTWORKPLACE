// Panel state management
const panelState = {
    A: ['Positions', 'Futures'],
    B: ['Markets'],
    C: []
};

const panelFlexValues = {
    A: 1,
    B: 1,
    C: 0
};

// Global drag state - using object to allow mutations across modules
const dragState = {
    draggedWidget: null,
    draggedTab: null,
    resizingDivider: null,
    resizeStartX: 0,
    resizeStartData: {}
};

// Export state objects
export {
    panelState,
    panelFlexValues,
    dragState
};
