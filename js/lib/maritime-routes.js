// Maritime Routes Module
// Manages loading and access to maritime route coordinate data

import { buildRouteKey } from './maritime-config.js';

/**
 * Maritime Routes Manager
 * Handles loading and caching of route data from JSON file
 */
class MaritimeRoutesManager {
    constructor() {
        this.routeData = null;
        this.isLoaded = false;
        this.loadPromise = null;
    }

    /**
     * Load route data from JSON file
     * @returns {Promise<object>} - Resolves with route data
     */
    async load() {
        // Return existing promise if already loading
        if (this.loadPromise) {
            return this.loadPromise;
        }

        // Return data if already loaded
        if (this.isLoaded && this.routeData) {
            return Promise.resolve(this.routeData);
        }

        // Start loading
        this.loadPromise = fetch('maritime_routes (1).json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load maritime routes: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                this.routeData = data;
                this.isLoaded = true;
                console.log('[Maritime Routes] Loaded route data:', {
                    generated: data.generated,
                    routeCount: Object.keys(data.routes || {}).length
                });
                return data;
            })
            .catch(error => {
                console.error('[Maritime Routes] Failed to load route data:', error);
                this.loadPromise = null; // Allow retry
                throw error;
            });

        return this.loadPromise;
    }

    /**
     * Get route coordinates by route key
     * @param {string} routeKey - Route key (e.g., "callao_to_shanghai")
     * @returns {Array<[number, number]>|null} - Array of [lng, lat] coordinates or null
     */
    getRoute(routeKey) {
        if (!this.isLoaded || !this.routeData) {
            console.warn('[Maritime Routes] Route data not loaded yet. Call load() first.');
            return null;
        }

        const route = this.routeData.routes[routeKey];
        if (!route) {
            console.warn(`[Maritime Routes] Route not found: ${routeKey}`);
            return null;
        }

        return route.coordinates;
    }

    /**
     * Get route by origin and destination port names
     * @param {string} origin - Origin port name
     * @param {string} destination - Destination port name
     * @returns {Array<[number, number]>|null} - Array of [lng, lat] coordinates or null
     */
    getRouteByPorts(origin, destination) {
        const routeKey = buildRouteKey(origin, destination);
        if (!routeKey) {
            console.warn('[Maritime Routes] Invalid port names:', { origin, destination });
            return null;
        }

        return this.getRoute(routeKey);
    }

    /**
     * Check if a route exists
     * @param {string} routeKey - Route key to check
     * @returns {boolean}
     */
    hasRoute(routeKey) {
        if (!this.isLoaded || !this.routeData) {
            return false;
        }
        return !!this.routeData.routes[routeKey];
    }

    /**
     * Get all available route keys
     * @returns {Array<string>} - Array of route keys
     */
    getAllRouteKeys() {
        if (!this.isLoaded || !this.routeData) {
            return [];
        }
        return Object.keys(this.routeData.routes);
    }

    /**
     * Get route metadata
     * @param {string} routeKey - Route key
     * @returns {object|null} - Route metadata (from, to) or null
     */
    getRouteMetadata(routeKey) {
        if (!this.isLoaded || !this.routeData) {
            return null;
        }

        const route = this.routeData.routes[routeKey];
        if (!route) {
            return null;
        }

        return {
            from: route.from,
            to: route.to,
            coordinateCount: route.coordinates.length
        };
    }

    /**
     * Get statistics about loaded routes
     * @returns {object} - Route statistics
     */
    getStats() {
        if (!this.isLoaded || !this.routeData) {
            return {
                loaded: false,
                totalRoutes: 0,
                generated: null
            };
        }

        const routes = this.routeData.routes;
        const routeKeys = Object.keys(routes);

        // Count routes by origin
        const byOrigin = {};
        routeKeys.forEach(key => {
            const route = routes[key];
            if (!byOrigin[route.from]) {
                byOrigin[route.from] = 0;
            }
            byOrigin[route.from]++;
        });

        return {
            loaded: true,
            totalRoutes: routeKeys.length,
            generated: this.routeData.generated,
            byOrigin
        };
    }
}

// Create singleton instance
const routesManager = new MaritimeRoutesManager();

// Export singleton instance and class
export { routesManager as default, MaritimeRoutesManager };
