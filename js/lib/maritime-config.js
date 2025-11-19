// Maritime Map Configuration Module
// Provides central configuration for Mapbox integration and port data

// Mapbox API Configuration
export const MAPBOX_CONFIG = {
    accessToken: 'pk.eyJ1IjoiamRjbTEwMjAwMSIsImEiOiJjbWhtcTdhNGQyNHlmMnFwcjF3YTF6YmlyIn0.uugX8H3ObKHWL7ia1MBFBg',
    style: 'mapbox://styles/mapbox/dark-v11',
    defaultCenter: [-50, 20], // Atlantic Ocean view
    defaultZoom: 2,
    projection: 'mercator'
};

// Animation configuration
export const ANIMATION_CONFIG = {
    duration: 120000,  // 120 seconds (2 minutes) per user requirement
    shipIconSize: 0.6,
    shipIconRotationOffset: 90
};

// Port name mappings - normalized keys for route lookup
export const PORT_NAME_MAP = {
    // Callao variations
    'Callao, Peru': 'callao',
    'Callao': 'callao',
    'CALLAO': 'callao',

    // Antofagasta variations
    'Antofagasta, Chile': 'antofagasta',
    'Antofagasta': 'antofagasta',
    'ANTOFAGASTA': 'antofagasta',

    // Shanghai variations
    'Shanghai, China': 'shanghai',
    'Shanghai': 'shanghai',
    'SHANGHAI': 'shanghai',

    // Busan variations
    'Busan, South Korea': 'busan',
    'Busan': 'busan',
    'BUSAN': 'busan',

    // Ningbo variations
    'Ningbo, China': 'ningbo',
    'Ningbo': 'ningbo',
    'NINGBO': 'ningbo',

    // Singapore variations
    'Singapore': 'singapore',
    'SINGAPORE': 'singapore',

    // Rotterdam variations
    'Rotterdam, Netherlands': 'rotterdam',
    'Rotterdam': 'rotterdam',
    'ROTTERDAM': 'rotterdam',

    // Hamburg variations
    'Hamburg, Germany': 'hamburg',
    'Hamburg': 'hamburg',
    'HAMBURG': 'hamburg',

    // Antwerp variations
    'Antwerp, Belgium': 'antwerp',
    'Antwerp': 'antwerp',
    'ANTWERP': 'antwerp',

    // Valencia variations
    'Valencia, Spain': 'valencia',
    'Valencia': 'valencia',
    'VALENCIA': 'valencia',

    // New Orleans variations
    'New Orleans, USA': 'neworleans',
    'New Orleans': 'neworleans',
    'NEW_ORLEANS': 'neworleans',
    'NEWORLEANS': 'neworleans',

    // Houston variations
    'Houston, USA': 'houston',
    'Houston': 'houston',
    'HOUSTON': 'houston',

    // Newark variations
    'Newark, USA': 'newark',
    'Newark': 'newark',
    'NEWARK': 'newark',

    // Montreal variations
    'Montreal, Canada': 'montreal',
    'Montreal': 'montreal',
    'MONTREAL': 'montreal'
};

// Port geographic locations (for map markers and fallback)
export const PORT_LOCATIONS = {
    callao: {
        coordinates: [-77.1393, -12.0476],
        country: 'Peru',
        displayName: 'Callao',
        category: 'SELLER'
    },
    antofagasta: {
        coordinates: [-70.4011, -23.6509],
        country: 'Chile',
        displayName: 'Antofagasta',
        category: 'SELLER'
    },
    shanghai: {
        coordinates: [121.4737, 31.2304],
        country: 'China',
        displayName: 'Shanghai',
        category: 'HUB'
    },
    busan: {
        coordinates: [129.0403, 35.1796],
        country: 'South Korea',
        displayName: 'Busan',
        category: 'PARITY'
    },
    ningbo: {
        coordinates: [121.5440, 29.8683],
        country: 'China',
        displayName: 'Ningbo',
        category: 'PARITY'
    },
    singapore: {
        coordinates: [103.8198, 1.3521],
        country: 'Singapore',
        displayName: 'Singapore',
        category: 'PARITY'
    },
    rotterdam: {
        coordinates: [4.4777, 51.9244],
        country: 'Netherlands',
        displayName: 'Rotterdam',
        category: 'HUB'
    },
    hamburg: {
        coordinates: [9.9937, 53.5511],
        country: 'Germany',
        displayName: 'Hamburg',
        category: 'PARITY'
    },
    antwerp: {
        coordinates: [4.4025, 51.2194],
        country: 'Belgium',
        displayName: 'Antwerp',
        category: 'PARITY'
    },
    valencia: {
        coordinates: [-0.3763, 39.4699],
        country: 'Spain',
        displayName: 'Valencia',
        category: 'PARITY'
    },
    neworleans: {
        coordinates: [-90.0715, 29.9511],
        country: 'USA',
        displayName: 'New Orleans',
        category: 'HUB'
    },
    houston: {
        coordinates: [-95.3698, 29.7604],
        country: 'USA',
        displayName: 'Houston',
        category: 'PARITY'
    },
    newark: {
        coordinates: [-74.1724, 40.7357],
        country: 'USA',
        displayName: 'Newark',
        category: 'PARITY'
    },
    montreal: {
        coordinates: [-73.5673, 45.5017],
        country: 'Canada',
        displayName: 'Montreal',
        category: 'PARITY'
    }
};

/**
 * Normalize port name for route lookup
 * Converts various port name formats to standardized route keys
 *
 * @param {string} fullPortName - Port name from game state (e.g., "Callao, Peru")
 * @returns {string} - Normalized port key (e.g., "callao")
 */
export function normalizePortName(fullPortName) {
    if (!fullPortName) return null;

    // Try direct mapping first
    if (PORT_NAME_MAP[fullPortName]) {
        return PORT_NAME_MAP[fullPortName];
    }

    // Try just the city name (before comma)
    const portOnly = fullPortName.split(',')[0].trim();
    if (PORT_NAME_MAP[portOnly]) {
        return PORT_NAME_MAP[portOnly];
    }

    // Fallback: lowercase and remove spaces
    return portOnly.toLowerCase().replace(/\s+/g, '');
}

/**
 * Build route key from origin and destination
 *
 * @param {string} origin - Origin port name
 * @param {string} destination - Destination port name
 * @returns {string|null} - Route key (e.g., "callao_to_shanghai") or null if invalid
 */
export function buildRouteKey(origin, destination) {
    const normalizedOrigin = normalizePortName(origin);
    const normalizedDest = normalizePortName(destination);

    if (!normalizedOrigin || !normalizedDest) {
        return null;
    }

    return `${normalizedOrigin}_to_${normalizedDest}`;
}

/**
 * Get port location by name
 *
 * @param {string} portName - Port name to lookup
 * @returns {object|null} - Port location data or null
 */
export function getPortLocation(portName) {
    const normalized = normalizePortName(portName);
    return PORT_LOCATIONS[normalized] || null;
}
