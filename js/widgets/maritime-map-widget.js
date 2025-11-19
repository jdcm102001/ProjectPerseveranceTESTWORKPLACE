// Maritime Map Widget
// Manages the maritime map visualization within the Positions widget

import mapboxManager from '../lib/mapbox-manager.js';

const MaritimeMapWidget = {
    isInitialized: false,
    retryCount: 0,
    maxRetries: 3,

    /**
     * Initialize the maritime map widget
     */
    async init() {
        if (this.isInitialized) {
            console.log('[Maritime Map Widget] Already initialized');
            return;
        }

        console.log('[Maritime Map Widget] Initializing...');

        try {
            // Show loading state
            this.showLoading();

            // Initialize the map
            await mapboxManager.initialize('maritimeMap');

            console.log('[Maritime Map Widget] Map initialized successfully');

            // Hide loading, show empty state
            this.hideLoading();
            this.updateEmptyState();
            this.updateActiveShipmentsCount();

            // Set up event listeners for position changes
            this.setupEventListeners();

            // Load any existing positions
            this.loadExistingPositions();

            this.isInitialized = true;

        } catch (error) {
            console.error('[Maritime Map Widget] Failed to initialize:', error);
            this.hideLoading();
            this.showError(error.message || 'Failed to initialize map');

            // Retry logic
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`[Maritime Map Widget] Retrying initialization (${this.retryCount}/${this.maxRetries})...`);
                setTimeout(() => this.init(), 2000 * this.retryCount);
            }
        }
    },

    /**
     * Set up event listeners for game state changes
     */
    setupEventListeners() {
        // Listen for new position creations
        window.addEventListener('position-created', (event) => {
            console.log('[Maritime Map Widget] Position created:', event.detail);
            this.handlePositionCreated(event.detail.position);
        });

        // Listen for position status changes
        window.addEventListener('position-status-changed', (event) => {
            console.log('[Maritime Map Widget] Position status changed:', event.detail);
            // Update UI or animations as needed
            this.updateActiveShipmentsCount();
            this.updateEmptyState();
        });

        // Listen for turn advancement
        window.addEventListener('turn-advanced', (event) => {
            console.log('[Maritime Map Widget] Turn advanced:', event.detail);
            // Update active shipment count and empty state
            this.updateActiveShipmentsCount();
            this.updateEmptyState();
        });

        // Listen for panel resizing (divider drag)
        window.addEventListener('panel-resized', () => {
            // Resize map to fit new panel dimensions
            if (mapboxManager.map) {
                mapboxManager.map.resize();
                console.log('[Maritime Map Widget] Map resized to fit panel');
            }
        });
    },

    /**
     * Load existing positions from game state
     */
    loadExistingPositions() {
        if (!window.GAME_STATE) {
            console.warn('[Maritime Map Widget] GAME_STATE not available');
            return;
        }

        const positions = window.GAME_STATE.physicalPositions || [];
        const inTransitPositions = positions.filter(pos => pos.status === 'IN_TRANSIT');

        console.log('[Maritime Map Widget] Loading existing positions:', {
            total: positions.length,
            inTransit: inTransitPositions.length
        });

        // Animate each in-transit position
        inTransitPositions.forEach(position => {
            this.handlePositionCreated(position);
        });
    },

    /**
     * Handle new position creation
     * @param {object} position - Position object from game state
     */
    async handlePositionCreated(position) {
        if (!position || !position.originPort || !position.destinationPort) {
            console.warn('[Maritime Map Widget] Invalid position data:', position);
            return;
        }

        // Only animate if position is in transit
        if (position.status !== 'IN_TRANSIT') {
            console.log('[Maritime Map Widget] Position not in transit, skipping animation:', position.status);
            return;
        }

        try {
            // Start animating the shipment
            console.log('[Maritime Map Widget] Starting animation for position:', position.id);
            await mapboxManager.animateShipment(position);
            console.log('[Maritime Map Widget] Animation completed for position:', position.id);

            // Update UI
            this.updateActiveShipmentsCount();
            this.updateEmptyState();

        } catch (error) {
            console.error('[Maritime Map Widget] Failed to animate shipment:', error);
        }
    },

    /**
     * Update active shipments count display
     */
    updateActiveShipmentsCount() {
        const countElement = document.getElementById('activeShipmentsCount');
        if (!countElement) return;

        const activeCount = mapboxManager.getActiveShipmentCount();
        countElement.textContent = activeCount;
    },

    /**
     * Update empty state visibility
     */
    updateEmptyState() {
        const emptyElement = document.querySelector('.maritime-map-empty');
        if (!emptyElement) return;

        const activeCount = mapboxManager.getActiveShipmentCount();

        if (activeCount === 0) {
            emptyElement.classList.remove('hidden');
        } else {
            emptyElement.classList.add('hidden');
        }
    },

    /**
     * Show loading state
     */
    showLoading() {
        const loadingElement = document.querySelector('.maritime-map-loading');
        if (loadingElement) {
            loadingElement.classList.remove('hidden');
        }
    },

    /**
     * Hide loading state
     */
    hideLoading() {
        const loadingElement = document.querySelector('.maritime-map-loading');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
    },

    /**
     * Show error state
     * @param {string} message - Error message to display
     */
    showError(message) {
        const errorElement = document.querySelector('.maritime-map-error');
        if (!errorElement) return;

        const messageElement = errorElement.querySelector('.maritime-map-error-message');
        if (messageElement) {
            messageElement.textContent = message;
        }

        errorElement.classList.remove('hidden');
    },

    /**
     * Hide error state
     */
    hideError() {
        const errorElement = document.querySelector('.maritime-map-error');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    },

    /**
     * Cleanup widget resources
     */
    destroy() {
        console.log('[Maritime Map Widget] Destroying...');

        // Cleanup map manager
        mapboxManager.destroy();

        // Remove event listeners (if we stored them)
        // Note: We're using anonymous functions, so we can't remove them individually
        // This is acceptable as the widget lifecycle is tied to the page

        this.isInitialized = false;
        this.retryCount = 0;
    },

    /**
     * Refresh the widget (reload positions)
     */
    refresh() {
        console.log('[Maritime Map Widget] Refreshing...');
        this.loadExistingPositions();
        this.updateActiveShipmentsCount();
        this.updateEmptyState();
    }
};

export { MaritimeMapWidget };
