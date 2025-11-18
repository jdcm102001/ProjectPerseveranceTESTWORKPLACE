// Mapbox Manager Module
// Handles map initialization, ship animations, and route visualization

import { MAPBOX_CONFIG, ANIMATION_CONFIG, getPortLocation } from './maritime-config.js';
import maritimeRoutes from './maritime-routes.js';

/**
 * Mapbox Manager
 * Manages Mapbox GL instance and ship animations
 */
class MapboxManager {
    constructor() {
        this.map = null;
        this.isInitialized = false;
        this.activeShipments = new Map(); // positionId -> animation state
        this.animationFrameId = null;
        this.shipIconLoaded = false;
    }

    /**
     * Initialize Mapbox map instance
     * @param {string} containerId - DOM element ID for map container
     * @returns {Promise<mapboxgl.Map>} - Resolves with map instance
     */
    async initialize(containerId) {
        if (this.isInitialized && this.map) {
            console.log('[Mapbox Manager] Map already initialized');
            return this.map;
        }

        // Ensure routes are loaded
        await maritimeRoutes.load();

        return new Promise((resolve, reject) => {
            try {
                mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;

                this.map = new mapboxgl.Map({
                    container: containerId,
                    style: MAPBOX_CONFIG.style,
                    center: MAPBOX_CONFIG.defaultCenter,
                    zoom: MAPBOX_CONFIG.defaultZoom,
                    projection: MAPBOX_CONFIG.projection
                });

                this.map.on('load', () => {
                    console.log('[Mapbox Manager] Map loaded successfully');
                    this.isInitialized = true;
                    this.loadShipIcon().then(() => {
                        resolve(this.map);
                    });
                });

                this.map.on('error', (e) => {
                    console.error('[Mapbox Manager] Map error:', e);
                    reject(e);
                });

            } catch (error) {
                console.error('[Mapbox Manager] Failed to initialize map:', error);
                reject(error);
            }
        });
    }

    /**
     * Create ship icon using canvas
     * @returns {HTMLCanvasElement}
     */
    createShipIcon() {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Center point
        const cx = size / 2;
        const cy = size / 2;

        // Draw ship body (triangle pointing up)
        ctx.beginPath();
        ctx.moveTo(cx, cy - 10); // Top point (front of ship)
        ctx.lineTo(cx - 8, cy + 4); // Bottom left
        ctx.lineTo(cx + 8, cy + 4); // Bottom right
        ctx.closePath();
        ctx.fillStyle = '#4A9EFF';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw ship bridge (rectangle)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - 4, cy - 6, 8, 4);
        ctx.strokeStyle = '#4A9EFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 4, cy - 6, 8, 4);

        // Draw direction indicator (circle at front)
        ctx.beginPath();
        ctx.arc(cx, cy - 10, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFA500';
        ctx.fill();

        return canvas;
    }

    /**
     * Load ship icon as map image
     * @returns {Promise<void>}
     */
    async loadShipIcon() {
        if (this.shipIconLoaded) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                // Create ship icon canvas
                const canvas = this.createShipIcon();

                // Convert canvas to ImageData for Mapbox
                const ctx = canvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // Create Mapbox-compatible image object
                const image = {
                    width: canvas.width,
                    height: canvas.height,
                    data: imageData.data
                };

                // Add to map
                if (!this.map.hasImage('ship-icon')) {
                    this.map.addImage('ship-icon', image);
                }

                this.shipIconLoaded = true;
                console.log('[Mapbox Manager] Ship icon loaded');
                resolve();

            } catch (error) {
                console.error('[Mapbox Manager] Failed to load ship icon:', error);
                reject(error);
            }
        });
    }

    /**
     * Start animating a shipment route
     * @param {object} position - Position object from game state
     * @returns {Promise<void>} - Resolves when animation completes
     */
    async animateShipment(position) {
        if (!this.isInitialized) {
            console.warn('[Mapbox Manager] Map not initialized yet');
            return Promise.reject(new Error('Map not initialized'));
        }

        // Get route coordinates
        const routeCoordinates = maritimeRoutes.getRouteByPorts(
            position.originPort,
            position.destinationPort
        );

        if (!routeCoordinates || routeCoordinates.length === 0) {
            console.warn('[Mapbox Manager] No route found for shipment:', {
                origin: position.originPort,
                destination: position.destinationPort,
                positionId: position.id
            });
            return Promise.reject(new Error('Route not found'));
        }

        // Create animation state
        const animationState = {
            positionId: position.id,
            routeCoordinates,
            startTime: null,
            duration: ANIMATION_CONFIG.duration,
            currentProgress: 0,
            completed: false,
            sourceId: `route-${position.id}`,
            layerId: `route-layer-${position.id}`,
            shipSourceId: `ship-${position.id}`,
            shipLayerId: `ship-layer-${position.id}`,
            position
        };

        // Add route line to map
        this.addRouteLayer(animationState);

        // Add ship marker to map
        this.addShipLayer(animationState);

        // Store animation state
        this.activeShipments.set(position.id, animationState);

        // Start animation loop if not already running
        if (!this.animationFrameId) {
            this.startAnimationLoop();
        }

        console.log('[Mapbox Manager] Started shipment animation:', {
            positionId: position.id,
            origin: position.originPort,
            destination: position.destinationPort,
            coordinateCount: routeCoordinates.length
        });

        // Return promise that resolves when animation completes
        return new Promise((resolve) => {
            animationState.onComplete = resolve;
        });
    }

    /**
     * Add route line layer to map
     * @param {object} animationState - Animation state object
     */
    addRouteLayer(animationState) {
        const { sourceId, layerId, routeCoordinates } = animationState;

        // Add route source
        if (!this.map.getSource(sourceId)) {
            this.map.addSource(sourceId, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: routeCoordinates
                    }
                }
            });
        }

        // Add route layer
        if (!this.map.getLayer(layerId)) {
            this.map.addLayer({
                id: layerId,
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': '#4A9EFF',
                    'line-width': 2,
                    'line-opacity': 0.6,
                    'line-dasharray': [2, 2]
                }
            });
        }
    }

    /**
     * Add ship marker layer to map
     * @param {object} animationState - Animation state object
     */
    addShipLayer(animationState) {
        const { shipSourceId, shipLayerId, routeCoordinates } = animationState;

        // Start at first coordinate
        const startCoord = routeCoordinates[0];

        // Add ship source
        if (!this.map.getSource(shipSourceId)) {
            this.map.addSource(shipSourceId, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: startCoord
                    },
                    properties: {
                        bearing: 0
                    }
                }
            });
        }

        // Add ship layer
        if (!this.map.getLayer(shipLayerId)) {
            this.map.addLayer({
                id: shipLayerId,
                type: 'symbol',
                source: shipSourceId,
                layout: {
                    'icon-image': 'ship-icon',
                    'icon-size': ANIMATION_CONFIG.shipIconSize,
                    'icon-rotate': ['get', 'bearing'],
                    'icon-rotation-alignment': 'map',
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true
                }
            });
        }
    }

    /**
     * Start animation loop
     */
    startAnimationLoop() {
        const animate = (timestamp) => {
            let allCompleted = true;

            this.activeShipments.forEach((state, positionId) => {
                if (!state.completed) {
                    allCompleted = false;

                    // Initialize start time
                    if (!state.startTime) {
                        state.startTime = timestamp;
                    }

                    // Calculate progress (0 to 1)
                    const elapsed = timestamp - state.startTime;
                    state.currentProgress = Math.min(elapsed / state.duration, 1);

                    // Update ship position
                    this.updateShipPosition(state);

                    // Check if completed
                    if (state.currentProgress >= 1) {
                        state.completed = true;
                        console.log('[Mapbox Manager] Shipment animation completed:', positionId);

                        // Call completion callback
                        if (state.onComplete) {
                            state.onComplete();
                        }

                        // Remove layers after a brief delay
                        setTimeout(() => {
                            this.removeShipmentLayers(state);
                            this.activeShipments.delete(positionId);
                        }, 2000);
                    }
                }
            });

            // Continue animation loop if there are active shipments
            if (!allCompleted) {
                this.animationFrameId = requestAnimationFrame(animate);
            } else {
                this.animationFrameId = null;
            }
        };

        this.animationFrameId = requestAnimationFrame(animate);
    }

    /**
     * Update ship position along route
     * @param {object} state - Animation state
     */
    updateShipPosition(state) {
        const { routeCoordinates, currentProgress, shipSourceId } = state;

        // Calculate position along route
        const totalLength = routeCoordinates.length - 1;
        const targetIndex = currentProgress * totalLength;
        const lowerIndex = Math.floor(targetIndex);
        const upperIndex = Math.min(Math.ceil(targetIndex), routeCoordinates.length - 1);
        const fraction = targetIndex - lowerIndex;

        const lowerCoord = routeCoordinates[lowerIndex];
        const upperCoord = routeCoordinates[upperIndex];

        // Interpolate between coordinates
        const currentLng = lowerCoord[0] + (upperCoord[0] - lowerCoord[0]) * fraction;
        const currentLat = lowerCoord[1] + (upperCoord[1] - lowerCoord[1]) * fraction;

        // Calculate bearing (direction)
        const bearing = this.calculateBearing(lowerCoord, upperCoord) + ANIMATION_CONFIG.shipIconRotationOffset;

        // Update ship source
        const source = this.map.getSource(shipSourceId);
        if (source) {
            source.setData({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [currentLng, currentLat]
                },
                properties: {
                    bearing
                }
            });
        }
    }

    /**
     * Calculate bearing between two coordinates
     * @param {Array<number>} coord1 - [lng, lat]
     * @param {Array<number>} coord2 - [lng, lat]
     * @returns {number} - Bearing in degrees
     */
    calculateBearing(coord1, coord2) {
        const [lng1, lat1] = coord1;
        const [lng2, lat2] = coord2;

        const dLng = (lng2 - lng1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;

        const y = Math.sin(dLng) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        return (bearing + 360) % 360;
    }

    /**
     * Remove shipment layers from map
     * @param {object} state - Animation state
     */
    removeShipmentLayers(state) {
        const { sourceId, layerId, shipSourceId, shipLayerId } = state;

        // Remove layers
        if (this.map.getLayer(shipLayerId)) {
            this.map.removeLayer(shipLayerId);
        }
        if (this.map.getLayer(layerId)) {
            this.map.removeLayer(layerId);
        }

        // Remove sources
        if (this.map.getSource(shipSourceId)) {
            this.map.removeSource(shipSourceId);
        }
        if (this.map.getSource(sourceId)) {
            this.map.removeSource(sourceId);
        }
    }

    /**
     * Stop and remove a specific shipment animation
     * @param {string} positionId - Position ID
     */
    stopShipment(positionId) {
        const state = this.activeShipments.get(positionId);
        if (state) {
            this.removeShipmentLayers(state);
            this.activeShipments.delete(positionId);
            console.log('[Mapbox Manager] Stopped shipment animation:', positionId);
        }
    }

    /**
     * Get active shipment count
     * @returns {number}
     */
    getActiveShipmentCount() {
        return this.activeShipments.size;
    }

    /**
     * Get progress for a specific shipment
     * @param {string} positionId - Position ID
     * @returns {number|null} - Progress (0-1) or null if not found
     */
    getShipmentProgress(positionId) {
        const state = this.activeShipments.get(positionId);
        return state ? state.currentProgress : null;
    }

    /**
     * Cleanup all resources
     */
    destroy() {
        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Remove all shipment layers
        this.activeShipments.forEach((state) => {
            this.removeShipmentLayers(state);
        });
        this.activeShipments.clear();

        // Remove map
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        this.isInitialized = false;
        this.shipIconLoaded = false;

        console.log('[Mapbox Manager] Destroyed');
    }
}

// Create singleton instance
const mapboxManager = new MapboxManager();

// Export singleton instance and class
export { mapboxManager as default, MapboxManager };
