# 🗺️ MARITIME SIMULATOR - INTEGRATION ARCHITECTURE ANALYSIS
**READ-ONLY ANALYSIS - NO CODE MODIFICATIONS**

**Generated:** 2025-11-18
**File Analyzed:** `maritime_simulator_complete (4).html`
**Purpose:** Real-time integration with trading simulator position tracking
**Mapbox Token:** `pk.eyJ1IjoiamRjbTEwMjAwMSIsImEiOiJjbWhtcTdhNGQyNHlmMnFwcjF3YTF6YmlyIn0.uugX8H3ObKHWL7ia1MBFBg`

---

## 📋 EXECUTIVE SUMMARY

This analysis focuses on **real-time integration** of the maritime map with your trading simulator's position tracking system. The goal is to dynamically visualize ship routes when copper positions are purchased, showing live route progress, distance, travel time, and estimated arrival dates.

### Integration Vision

**PREFERRED APPROACH:** Positions Widget with Embedded Map
```
┌─────────────────────────────────────────────────┐
│ 📦 PHYSICAL POSITIONS WIDGET                    │
├─────────────────────────────────────────────────┤
│ 🗺️ MARITIME MAP (TOP SECTION - 350px height)   │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Interactive Mapbox with routes/ships]      │ │
│ │ • Shows all active shipment routes          │ │
│ │ • Animated ship markers for in-transit      │ │
│ │ • Tooltips with ETA, distance, progress     │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ 📊 POSITIONS TABLE (BELOW MAP)                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ TYPE │ ROUTE │ TONNAGE │ ETA │ STATUS │ 🗺️ │ │
│ │ BUY  │ CALLAO→SHANGHAI │ 5000 │ 28d │ ✓  │ │
│ │ BUY  │ ANTO→ROTTERDAM  │ 3000 │ 20d │ ✓  │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Key Requirements
1. **Event-Driven Updates:** Map responds to position purchases in real-time
2. **Multi-Route Display:** Show all active positions simultaneously
3. **Live Data Integration:** Pull logistics data from monthly JSON files
4. **Status Synchronization:** Update map when positions change status

---

## 🏗️ CURRENT ARCHITECTURE ANALYSIS

### Maritime Simulator Structure

**File:** `maritime_simulator_complete (4).html` (724 lines)

```
├── Mapbox Configuration (Line 166)
│   └── Token: pk.eyJ1IjoiamRjbTEwMjAwMSIsImEiOiJjbWhtcTdhNGQyNHlmMnFwcjF3YTF6YmlyIn0...
│
├── Route Data (Lines 169-470)
│   └── Embedded JSON with 24 predefined routes
│       ├── callao_to_shanghai
│       ├── callao_to_rotterdam
│       ├── antofagasta_to_shanghai
│       └── ... (21 more routes)
│
├── Port Registry (Lines 472-488)
│   └── 14 ports with coordinates
│
├── Map Initialization (Lines 497-527)
│   └── initMap() - Creates Mapbox instance
│
├── Animation Engine (Lines 600-666)
│   └── animateShip() - 8-second linear animation
│
└── Public API (Lines 668-721)
    └── startShipmentAnimation(shipmentData)
```

### Trading Simulator Structure

**Position Purchase Flow:**
```
1. User clicks TRADE button in Markets Widget
2. TradePanel.executeTrade() called
3. GAME_STATE.purchaseCopper() creates position object
4. Position object added to GAME_STATE.physicalPositions[]
5. PositionsWidget.render() updates positions table
```

**Position Object Structure (from game-state.js:97-117):**
```javascript
{
    id: 'POS_1234567890_abc',
    type: 'PHYSICAL',
    supplier: 'CALLAO',                    // or 'ANTOFAGASTA'
    originPort: 'Callao, Peru',           // Full name with country
    destinationPort: 'Shanghai, China',    // Full name with country
    tonnage: 5000,
    costPerMT: 9299,
    totalCost: 46495000,
    exchange: 'LME',
    shippingTerms: 'CIF',
    purchaseMonth: 'January',
    purchaseTurn: 1,
    travelTimeDays: 28.3,                 // From LOGISTICS data
    distanceNM: 9500,                     // From LOGISTICS data
    arrivalTurn: 2,                       // currentTurn + ceil(travelDays/30)
    status: 'IN_TRANSIT'                  // or 'ARRIVED', 'SOLD_PENDING_SETTLEMENT'
}
```

**Logistics Data Structure (from january.js:58-150):**
```javascript
LOGISTICS: {
    FREIGHT_RATES: {
        CALLAO: {
            SHANGHAI: {
                PORT_NAME: "Shanghai",
                COUNTRY: "China",
                DISTANCE_NM: 9500,          // ← Use for map display
                TRAVEL_TIME_DAYS: 28.3,     // ← Use for progress calc
                CIF_RATE_USD_PER_TONNE: 63,
                FOB_RATE_USD_PER_TONNE: 64
            },
            // ... 11 more destinations from Callao
        },
        ANTOFAGASTA: {
            // ... 12 destinations from Antofagasta
        }
    }
}
```

---

## 🔄 DATA FLOW ARCHITECTURE

### Real-Time Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│ USER ACTION: Click TRADE button in Markets Widget          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ GAME_STATE.purchaseCopper()                                 │
│ • Creates position object with route info                   │
│ • Adds to physicalPositions[]                               │
│ • Returns new position object                               │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ EVENT TRIGGER: 'position-created' custom event              │
│ • Dispatched with position data                             │
│ • Listened to by MaritimeMapWidget                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ MaritimeMapWidget.onPositionCreated(position)               │
│ • Extract origin/destination ports                          │
│ • Look up route coordinates                                 │
│ • Look up logistics data (distance, travel time)            │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ MaritimeMapWidget.addRoute(routeData)                       │
│ • Draw route line on map                                    │
│ • Create ship marker at origin                              │
│ • Store route in activeRoutes Map                           │
│ • Calculate animation duration based on travel time         │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ MaritimeMapWidget.animateShip(routeData)                    │
│ • Start ship animation along route                          │
│ • Update progress in real-time                              │
│ • Show tooltip with ETA, distance, progress                 │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ PositionsWidget.render()                                    │
│ • Refresh positions table                                   │
│ • Add "View on Map" button for each position                │
│ • Highlight position row when ship is clicked on map        │
└─────────────────────────────────────────────────────────────┘
```

### Position Status Changes

```
STATUS CHANGE FLOW:
┌──────────────────────────────────────────────────────────┐
│ Turn Advancement / Position Sale                         │
└────────────────┬─────────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────────┐
│ GAME_STATE updates position.status                       │
│ • IN_TRANSIT → ARRIVED                                   │
│ • IN_TRANSIT → SOLD_PENDING_SETTLEMENT                   │
└────────────────┬─────────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────────┐
│ EVENT TRIGGER: 'position-status-changed'                 │
└────────────────┬─────────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────────┐
│ MaritimeMapWidget.onPositionStatusChanged(position)      │
│ • If ARRIVED: Complete animation, remove ship marker     │
│ • If SOLD: Change route color to green                   │
│ • Keep route visible for historical view                 │
└──────────────────────────────────────────────────────────┘
```

---

## 📊 DATA MAPPING STRATEGY

### Port Name Normalization

**Problem:** Maritime routes use lowercase keys, positions use full names

```javascript
// Maritime route keys (lowercase, underscore-separated)
"callao_to_shanghai"
"antofagasta_to_rotterdam"

// Position data (full names with country)
originPort: "Callao, Peru"
destinationPort: "Shanghai, China"
```

**Solution: Port Name Mapper**

```javascript
const PORT_NAME_MAP = {
    // Origin ports (suppliers)
    'Callao, Peru': 'callao',
    'Callao': 'callao',
    'CALLAO': 'callao',

    'Antofagasta, Chile': 'antofagasta',
    'Antofagasta': 'antofagasta',
    'ANTOFAGASTA': 'antofagasta',

    // Destination ports (buyers)
    'Shanghai, China': 'shanghai',
    'Shanghai': 'shanghai',

    'Busan, South Korea': 'busan',
    'Busan': 'busan',

    'Ningbo, China': 'ningbo',
    'Ningbo': 'ningbo',

    'Singapore, Singapore': 'singapore',
    'Singapore': 'singapore',

    'Rotterdam, Netherlands': 'rotterdam',
    'Rotterdam': 'rotterdam',

    'Antwerp, Belgium': 'antwerp',
    'Antwerp': 'antwerp',

    'Hamburg, Germany': 'hamburg',
    'Hamburg': 'hamburg',

    'Valencia, Spain': 'valencia',
    'Valencia': 'valencia',

    'New Orleans, USA': 'neworleans',
    'New Orleans': 'neworleans',

    'Houston, USA': 'houston',
    'Houston': 'houston',

    'Newark, USA': 'newark',
    'Newark': 'newark',

    'Montreal, Canada': 'montreal',
    'Montreal': 'montreal'
};

function normalizePortName(fullPortName) {
    // Strip country if present
    const portOnly = fullPortName.split(',')[0].trim();

    // Try exact match first
    if (PORT_NAME_MAP[fullPortName]) {
        return PORT_NAME_MAP[fullPortName];
    }

    // Try port name only
    if (PORT_NAME_MAP[portOnly]) {
        return PORT_NAME_MAP[portOnly];
    }

    // Fallback: lowercase and remove spaces
    return portOnly.toLowerCase().replace(/\s+/g, '');
}
```

### Route Lookup Function

```javascript
function getRouteForPosition(position) {
    const origin = normalizePortName(position.originPort);
    const destination = normalizePortName(position.destinationPort);

    const routeKey = `${origin}_to_${destination}`;

    // Check if route exists in maritime data
    if (maritimeData.routes[routeKey]) {
        return {
            key: routeKey,
            coordinates: maritimeData.routes[routeKey].coordinates,
            from: maritimeData.routes[routeKey].from,
            to: maritimeData.routes[routeKey].to
        };
    }

    // Route not found
    console.warn(`Route not found: ${routeKey}`);
    return null;
}
```

### Logistics Data Extraction

```javascript
function getLogisticsDataForPosition(position) {
    const monthData = GAME_STATE.currentMonthData;

    // Extract supplier key (CALLAO or ANTOFAGASTA)
    const supplier = position.supplier.toUpperCase();

    // Extract destination port name (without country)
    const destPort = position.destinationPort.split(',')[0].trim().toUpperCase().replace(/\s+/g, '_');

    // Access logistics data
    const logisticsData = monthData.LOGISTICS.FREIGHT_RATES[supplier][destPort];

    return {
        distance: logisticsData.DISTANCE_NM,
        travelTime: logisticsData.TRAVEL_TIME_DAYS,
        portName: logisticsData.PORT_NAME,
        country: logisticsData.COUNTRY
    };
}
```

---

## 🎯 PREFERRED INTEGRATION: POSITIONS WIDGET

### Implementation Architecture

#### 1. File Structure (After Refactoring)

```
js/
├── lib/
│   ├── maritime-config.js (NEW)
│   │   └── Mapbox token, port mappings
│   │
│   ├── maritime-routes.js (NEW)
│   │   └── Route coordinate data
│   │
│   └── mapbox-manager.js (NEW)
│       └── Core map/animation logic
│
├── widgets/
│   ├── positions-widget.js (MODIFIED)
│   │   └── Integrate map section
│   │
│   └── maritime-map-widget.js (NEW)
│       └── Position-specific map wrapper
│
└── core/
    └── game-state.js (MODIFIED)
        └── Add event dispatching

css/
└── maritime-map.css (NEW)
    └── Scoped styles for embedded map
```

#### 2. Widget HTML Structure (Modified)

**File:** `js/drag-drop/widget-drag.js` (lines 251-264)

**Current:**
```javascript
if (widgetName === 'Positions') {
    content.innerHTML = `
        <div class="positions-widget-content" style="padding: 15px;">
            <div class="section-title">📦 Physical Positions</div>
            <div id="positionsContainer"></div>
        </div>
    `;
}
```

**Proposed:**
```javascript
if (widgetName === 'Positions') {
    content.innerHTML = `
        <div class="positions-widget-content">
            <!-- MARITIME MAP SECTION (TOP) -->
            <div id="maritimeMapSection" class="maritime-map-section" style="display: none;">
                <div class="map-header">
                    <span class="section-title">🗺️ Active Shipments</span>
                    <button id="toggleMapBtn" class="map-toggle-btn">Hide Map</button>
                </div>
                <div id="maritimeMapContainer" class="maritime-map-container" style="height: 350px; position: relative;">
                    <!-- Mapbox GL map renders here -->
                </div>
                <div class="map-legend-compact">
                    <div class="legend-item"><span class="ship-icon">🚢</span>In Transit</div>
                    <div class="legend-item"><div class="line-sample" style="background: #3b82f6;"></div>Active Route</div>
                    <div class="legend-item"><div class="line-sample" style="background: #10b981;"></div>Completed</div>
                </div>
            </div>

            <!-- POSITIONS TABLE SECTION (BELOW) -->
            <div class="positions-table-section" style="padding: 15px;">
                <div class="section-title">📦 Physical Positions</div>
                <div id="positionsContainer"></div>
            </div>
        </div>
    `;

    setTimeout(() => {
        PositionsWidget.init();
        MaritimeMapWidget.init('maritimeMapContainer');
    }, 100);
}
```

#### 3. CSS Scoping

**File:** `css/maritime-map.css` (NEW)

```css
/* Scope all styles to .maritime-map-section to avoid conflicts */

.maritime-map-section {
    background: rgba(15, 23, 42, 0.5);
    border-radius: 8px;
    margin-bottom: 20px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.map-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
    background: rgba(10, 25, 41, 0.8);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.map-toggle-btn {
    font-size: 11px;
    padding: 4px 12px;
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    border: 1px solid #3b82f6;
    border-radius: 4px;
    cursor: pointer;
}

.maritime-map-container {
    position: relative;
    width: 100%;
    /* Mapbox requires explicit height */
}

/* Override Mapbox global styles within our container */
.maritime-map-container .mapboxgl-canvas {
    outline: none;
}

.maritime-map-container .mapboxgl-ctrl-bottom-right {
    display: none; /* Hide Mapbox attribution in compact mode */
}

.map-legend-compact {
    display: flex;
    gap: 20px;
    padding: 8px 15px;
    background: rgba(10, 25, 41, 0.6);
    font-size: 11px;
    color: #94a3b8;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
}

.line-sample {
    width: 20px;
    height: 3px;
    border-radius: 2px;
}

.ship-icon {
    font-size: 16px;
}

/* Route tooltip styles */
.route-tooltip {
    background: rgba(15, 23, 42, 0.95);
    color: #e2e8f0;
    padding: 12px;
    border-radius: 6px;
    font-size: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.route-tooltip .route-header {
    font-weight: 700;
    color: #60a5fa;
    margin-bottom: 8px;
}

.route-tooltip .route-stat {
    display: flex;
    justify-content: space-between;
    margin: 4px 0;
}

.route-tooltip .route-stat-label {
    color: #94a3b8;
}

.route-tooltip .route-stat-value {
    color: #e2e8f0;
    font-weight: 600;
}
```

---

## 🔌 EVENT SYSTEM DESIGN

### Custom Events for Real-Time Updates

**File:** `js/core/game-state.js` (MODIFIED)

**Add event dispatching after position creation:**

```javascript
purchaseCopper(supplier, tonnage, costPerMT, totalCost, isLTA, exchange, shippingTerms, destination) {
    // ... existing code creates position object ...

    this.physicalPositions.push(position);
    this.recordPurchase(supplier, tonnage, isLTA);

    // ⭐ NEW: Dispatch event for maritime map
    window.dispatchEvent(new CustomEvent('position-created', {
        detail: {
            position: position,
            timestamp: Date.now()
        }
    }));

    return position;
}
```

**Add event for status changes:**

```javascript
updatePositionStatus(positionId, newStatus) {
    const position = this.physicalPositions.find(p => p.id === positionId);
    if (position) {
        const oldStatus = position.status;
        position.status = newStatus;

        // ⭐ NEW: Dispatch event for status change
        window.dispatchEvent(new CustomEvent('position-status-changed', {
            detail: {
                position: position,
                oldStatus: oldStatus,
                newStatus: newStatus,
                timestamp: Date.now()
            }
        }));
    }
}
```

### Event Listeners in Maritime Widget

**File:** `js/widgets/maritime-map-widget.js` (NEW)

```javascript
const MaritimeMapWidget = {
    map: null,
    activeShipments: new Map(), // positionId -> shipment data

    init(containerId) {
        this.initMap(containerId);
        this.attachEventListeners();
        this.loadExistingPositions();
    },

    attachEventListeners() {
        // Listen for new position purchases
        window.addEventListener('position-created', (event) => {
            this.onPositionCreated(event.detail.position);
        });

        // Listen for position status changes
        window.addEventListener('position-status-changed', (event) => {
            this.onPositionStatusChanged(event.detail);
        });

        // Listen for turn advancement
        window.addEventListener('turn-advanced', (event) => {
            this.onTurnAdvanced(event.detail);
        });
    },

    onPositionCreated(position) {
        console.log('🚢 New position created:', position.id);

        // Get route coordinates
        const route = this.getRouteForPosition(position);
        if (!route) {
            console.warn('Route not found for position:', position);
            return;
        }

        // Show map section if hidden
        this.showMapSection();

        // Add route to map
        this.addShipment({
            positionId: position.id,
            routeCoords: route.coordinates,
            origin: position.originPort,
            destination: position.destinationPort,
            tonnage: position.tonnage,
            distance: position.distanceNM,
            travelTime: position.travelTimeDays,
            status: position.status,
            arrivalTurn: position.arrivalTurn
        });
    },

    onPositionStatusChanged({ position, oldStatus, newStatus }) {
        console.log(`📊 Position ${position.id} status: ${oldStatus} → ${newStatus}`);

        const shipment = this.activeShipments.get(position.id);
        if (!shipment) return;

        if (newStatus === 'ARRIVED') {
            // Complete animation, change route color
            this.completeShipment(position.id);
        } else if (newStatus === 'SOLD_PENDING_SETTLEMENT') {
            // Mark as sold, change to green
            this.markShipmentSold(position.id);
        }
    },

    loadExistingPositions() {
        // On widget init, load all existing positions
        GAME_STATE.physicalPositions.forEach(position => {
            if (position.status === 'IN_TRANSIT' || position.status === 'ARRIVED') {
                this.onPositionCreated(position);
            }
        });

        // Show or hide map based on whether there are positions
        if (GAME_STATE.physicalPositions.length > 0) {
            this.showMapSection();
        } else {
            this.hideMapSection();
        }
    },

    showMapSection() {
        const section = document.getElementById('maritimeMapSection');
        if (section) section.style.display = 'block';
    },

    hideMapSection() {
        const section = document.getElementById('maritimeMapSection');
        if (section) section.style.display = 'none';
    }
};
```

---

## 🛠️ DETAILED COMPONENT DESIGN

### 1. Maritime Configuration Module

**File:** `js/lib/maritime-config.js` (NEW)

```javascript
// Mapbox API Configuration
export const MAPBOX_CONFIG = {
    accessToken: 'pk.eyJ1IjoiamRjbTEwMjAwMSIsImEiOiJjbWhtcTdhNGQyNHlmMnFwcjF3YTF6YmlyIn0.uugX8H3ObKHWL7ia1MBFBg',
    style: 'mapbox://styles/mapbox/dark-v11',
    defaultCenter: [-50, 20],
    defaultZoom: 2,
    projection: 'mercator'
};

// Port name mappings
export const PORT_NAME_MAP = {
    'Callao, Peru': 'callao',
    'Callao': 'callao',
    'CALLAO': 'callao',
    'Antofagasta, Chile': 'antofagasta',
    'Antofagasta': 'antofagasta',
    'ANTOFAGASTA': 'antofagasta',
    'Shanghai, China': 'shanghai',
    'Shanghai': 'shanghai',
    'Busan, South Korea': 'busan',
    'Busan': 'busan',
    'Ningbo, China': 'ningbo',
    'Ningbo': 'ningbo',
    'Singapore, Singapore': 'singapore',
    'Singapore': 'singapore',
    'Rotterdam, Netherlands': 'rotterdam',
    'Rotterdam': 'rotterdam',
    'Antwerp, Belgium': 'antwerp',
    'Antwerp': 'antwerp',
    'Hamburg, Germany': 'hamburg',
    'Hamburg': 'hamburg',
    'Valencia, Spain': 'valencia',
    'Valencia': 'valencia',
    'New Orleans, USA': 'neworleans',
    'New Orleans': 'neworleans',
    'Houston, USA': 'houston',
    'Houston': 'houston',
    'Newark, USA': 'newark',
    'Newark': 'newark',
    'Montreal, Canada': 'montreal',
    'Montreal': 'montreal'
};

// Normalize port name for route lookup
export function normalizePortName(fullPortName) {
    const portOnly = fullPortName.split(',')[0].trim();

    if (PORT_NAME_MAP[fullPortName]) {
        return PORT_NAME_MAP[fullPortName];
    }

    if (PORT_NAME_MAP[portOnly]) {
        return PORT_NAME_MAP[portOnly];
    }

    return portOnly.toLowerCase().replace(/\s+/g, '');
}

// Port locations for markers (from maritime simulator)
export const PORT_LOCATIONS = {
    antofagasta: { name: 'Antofagasta', coords: [-70.38, -23.65] },
    callao: { name: 'Callao', coords: [-77.13, -12.04] },
    neworleans: { name: 'New Orleans', coords: [-90.07, 29.88] },
    houston: { name: 'Houston', coords: [-95.06, 29.76] },
    shanghai: { name: 'Shanghai', coords: [121.47, 31.23] },
    ningbo: { name: 'Ningbo', coords: [121.55, 29.87] },
    busan: { name: 'Busan', coords: [129.04, 35.10] },
    rotterdam: { name: 'Rotterdam', coords: [4.48, 51.92] },
    antwerp: { name: 'Antwerp', coords: [4.40, 51.22] },
    valencia: { name: 'Valencia', coords: [-0.38, 39.47] },
    singapore: { name: 'Singapore', coords: [103.85, 1.29] },
    newark: { name: 'Newark', coords: [-74.17, 40.73] },
    montreal: { name: 'Montreal', coords: [-73.56, 45.50] },
    hamburg: { name: 'Hamburg', coords: [9.99, 53.55] }
};

// Port categorization for visual styling
export const PORT_CATEGORIES = {
    HUB: ['shanghai', 'neworleans', 'rotterdam'],
    SELLER: ['antofagasta', 'callao'],
    PARITY: ['ningbo', 'busan', 'singapore', 'antwerp', 'hamburg', 'valencia', 'houston', 'newark', 'montreal']
};
```

### 2. Maritime Routes Data Module

**File:** `js/lib/maritime-routes.js` (NEW)

**Option A: Load from External JSON (PREFERRED)**

```javascript
// Load route coordinates from external JSON file
let routesData = null;

export async function loadMaritimeRoutes() {
    try {
        const response = await fetch('/data/maritime_routes.json');
        routesData = await response.json();
        return routesData;
    } catch (error) {
        console.error('Failed to load maritime routes:', error);
        return null;
    }
}

export function getRouteCoordinates(routeKey) {
    if (!routesData) {
        console.warn('Routes data not loaded');
        return null;
    }

    return routesData.routes[routeKey];
}

export function getAllRouteKeys() {
    if (!routesData) return [];
    return Object.keys(routesData.routes);
}
```

**Option B: Embed Routes (if JSON file doesn't exist)**

```javascript
// Extract route data from maritime_simulator_complete (4).html
// Lines 169-470

export const MARITIME_ROUTES = {
    "antofagasta_to_shanghai": {
        "from": "antofagasta",
        "to": "shanghai",
        "coordinates": [
            [-70.38129892695875, -23.681594317000716],
            [-154.0587559353398, 7.918334989102462],
            // ... rest of coordinates
        ]
    },
    // ... all 24 routes
};

export function getRouteCoordinates(routeKey) {
    return MARITIME_ROUTES[routeKey];
}
```

### 3. Mapbox Manager Module

**File:** `js/lib/mapbox-manager.js` (NEW)

```javascript
import { MAPBOX_CONFIG, PORT_LOCATIONS, PORT_CATEGORIES } from './maritime-config.js';

class MapboxManager {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.map = null;
        this.markers = new Map(); // portId -> marker
        this.routes = new Map(); // routeId -> route layer
        this.ships = new Map(); // shipId -> ship marker
        this.animations = new Map(); // shipId -> animation data

        // Configuration
        this.config = {
            showPortMarkers: options.showPortMarkers !== false,
            compactMode: options.compactMode === true,
            interactiveShips: options.interactiveShips !== false
        };
    }

    async init() {
        // Ensure Mapbox GL is loaded
        if (typeof mapboxgl === 'undefined') {
            console.error('Mapbox GL JS not loaded');
            return false;
        }

        mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;

        this.map = new mapboxgl.Map({
            container: this.containerId,
            style: MAPBOX_CONFIG.style,
            center: MAPBOX_CONFIG.defaultCenter,
            zoom: MAPBOX_CONFIG.defaultZoom,
            projection: MAPBOX_CONFIG.projection
        });

        await new Promise(resolve => {
            this.map.on('load', () => {
                if (this.config.showPortMarkers) {
                    this.addPortMarkers();
                }
                resolve();
            });
        });

        return true;
    }

    addPortMarkers() {
        Object.entries(PORT_LOCATIONS).forEach(([portId, port]) => {
            const el = document.createElement('div');
            el.className = 'port-marker';

            // Style based on category
            if (PORT_CATEGORIES.HUB.includes(portId)) {
                el.classList.add('port-hub');
                el.style.background = '#ff8c00';
                el.style.borderRadius = '50%';
            } else if (PORT_CATEGORIES.SELLER.includes(portId)) {
                el.classList.add('port-seller');
                el.style.background = '#ffd700';
                el.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
            } else {
                el.classList.add('port-parity');
                el.style.background = '#3cb371';
                el.style.borderRadius = '50%';
            }

            el.style.width = '12px';
            el.style.height = '12px';
            el.style.border = '2px solid #fff';
            el.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.4)';

            const marker = new mapboxgl.Marker(el)
                .setLngLat(port.coords)
                .setPopup(new mapboxgl.Popup({ offset: 15 })
                    .setHTML(`<strong>${port.name}</strong><br>Code: ${portId.toUpperCase()}`))
                .addTo(this.map);

            this.markers.set(portId, marker);
        });
    }

    addRoute(routeId, coordinates, options = {}) {
        // Remove existing route if present
        this.removeRoute(routeId);

        const sourceId = `route-source-${routeId}`;
        const layerId = `route-layer-${routeId}`;

        // Add source
        this.map.addSource(sourceId, {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                }
            }
        });

        // Add layer
        this.map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': options.color || '#3b82f6',
                'line-width': options.width || 2,
                'line-opacity': options.opacity || 0.8
            }
        });

        this.routes.set(routeId, { sourceId, layerId, coordinates });

        // Fit map to route bounds if requested
        if (options.fitBounds) {
            const bounds = new mapboxgl.LngLatBounds();
            coordinates.forEach(coord => bounds.extend(coord));
            this.map.fitBounds(bounds, { padding: 60, duration: 1000 });
        }
    }

    removeRoute(routeId) {
        const route = this.routes.get(routeId);
        if (!route) return;

        if (this.map.getLayer(route.layerId)) {
            this.map.removeLayer(route.layerId);
        }
        if (this.map.getSource(route.sourceId)) {
            this.map.removeSource(route.sourceId);
        }

        this.routes.delete(routeId);
    }

    addShip(shipId, startCoords, options = {}) {
        const el = document.createElement('div');
        el.className = 'ship-marker';
        el.textContent = options.icon || '🚢';
        el.style.fontSize = '20px';
        el.style.cursor = options.interactive ? 'pointer' : 'default';

        const marker = new mapboxgl.Marker(el)
            .setLngLat(startCoords)
            .addTo(this.map);

        // Add tooltip if provided
        if (options.tooltip) {
            const popup = new mapboxgl.Popup({
                offset: 25,
                closeButton: false,
                closeOnClick: false
            }).setHTML(options.tooltip);

            marker.setPopup(popup);

            if (options.showTooltip) {
                marker.togglePopup();
            }
        }

        this.ships.set(shipId, { marker, element: el });
        return marker;
    }

    removeShip(shipId) {
        const ship = this.ships.get(shipId);
        if (ship) {
            ship.marker.remove();
            this.ships.delete(shipId);
        }
    }

    animateShip(shipId, coordinates, duration, onProgress, onComplete) {
        const ship = this.ships.get(shipId);
        if (!ship) {
            console.warn(`Ship ${shipId} not found`);
            return;
        }

        const startTime = Date.now();
        const totalSegments = coordinates.length - 1;

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Calculate position along route
            const position = progress * totalSegments;
            const currentSegment = Math.floor(position);
            const segmentProgress = position - currentSegment;

            if (currentSegment < totalSegments) {
                const start = coordinates[currentSegment];
                const end = coordinates[currentSegment + 1];

                const lng = start[0] + (end[0] - start[0]) * segmentProgress;
                const lat = start[1] + (end[1] - start[1]) * segmentProgress;

                ship.marker.setLngLat([lng, lat]);

                // Call progress callback
                if (onProgress) {
                    onProgress(progress, [lng, lat]);
                }
            }

            if (progress < 1) {
                const frameId = requestAnimationFrame(animate);
                this.animations.set(shipId, { frameId, progress });
            } else {
                this.animations.delete(shipId);
                if (onComplete) {
                    onComplete();
                }
            }
        };

        animate();
    }

    stopAnimation(shipId) {
        const anim = this.animations.get(shipId);
        if (anim) {
            cancelAnimationFrame(anim.frameId);
            this.animations.delete(shipId);
        }
    }

    updateRouteColor(routeId, color) {
        const route = this.routes.get(routeId);
        if (route) {
            this.map.setPaintProperty(route.layerId, 'line-color', color);
        }
    }

    destroy() {
        // Clean up animations
        this.animations.forEach((anim, shipId) => {
            this.stopAnimation(shipId);
        });

        // Remove ships
        this.ships.forEach((ship, shipId) => {
            this.removeShip(shipId);
        });

        // Remove routes
        this.routes.forEach((route, routeId) => {
            this.removeRoute(routeId);
        });

        // Remove markers
        this.markers.forEach((marker) => {
            marker.remove();
        });

        // Destroy map
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}

export { MapboxManager };
```

### 4. Maritime Map Widget (Position Integration)

**File:** `js/widgets/maritime-map-widget.js` (NEW)

```javascript
import { GAME_STATE } from '../core/game-state.js';
import { MapboxManager } from '../lib/mapbox-manager.js';
import { normalizePortName } from '../lib/maritime-config.js';
import { getRouteCoordinates, loadMaritimeRoutes } from '../lib/maritime-routes.js';

const MaritimeMapWidget = {
    mapManager: null,
    activeShipments: new Map(),
    routesData: null,

    async init(containerId) {
        console.log('🗺️ Initializing Maritime Map Widget...');

        // Load route data
        this.routesData = await loadMaritimeRoutes();
        if (!this.routesData) {
            console.error('Failed to load maritime routes data');
            return;
        }

        // Initialize Mapbox manager
        this.mapManager = new MapboxManager(containerId, {
            showPortMarkers: true,
            compactMode: true,
            interactiveShips: true
        });

        const initialized = await this.mapManager.init();
        if (!initialized) {
            console.error('Failed to initialize map');
            return;
        }

        // Attach event listeners
        this.attachEventListeners();

        // Load existing positions
        this.loadExistingPositions();

        console.log('✅ Maritime Map Widget ready');
    },

    attachEventListeners() {
        // New position created
        window.addEventListener('position-created', (event) => {
            this.onPositionCreated(event.detail.position);
        });

        // Position status changed
        window.addEventListener('position-status-changed', (event) => {
            this.onPositionStatusChanged(event.detail);
        });

        // Turn advanced
        window.addEventListener('turn-advanced', (event) => {
            this.updateAllShipments();
        });
    },

    onPositionCreated(position) {
        console.log('🚢 New shipment:', position.id);

        // Get route for this position
        const route = this.getRouteForPosition(position);
        if (!route) {
            console.warn('No route found for', position.originPort, '→', position.destinationPort);
            return;
        }

        // Show map section
        this.showMapSection();

        // Add shipment to map
        this.addShipment(position, route);
    },

    getRouteForPosition(position) {
        const origin = normalizePortName(position.originPort);
        const destination = normalizePortName(position.destinationPort);
        const routeKey = `${origin}_to_${destination}`;

        const routeData = getRouteCoordinates(routeKey);
        if (!routeData) return null;

        return {
            key: routeKey,
            coordinates: routeData.coordinates,
            from: origin,
            to: destination
        };
    },

    addShipment(position, route) {
        const shipmentId = position.id;

        // Add route line to map
        this.mapManager.addRoute(shipmentId, route.coordinates, {
            color: '#3b82f6',
            width: 2,
            opacity: 0.8,
            fitBounds: this.activeShipments.size === 0 // Fit only for first route
        });

        // Add ship marker at starting position
        const startCoords = route.coordinates[0];
        const tooltip = this.createShipTooltip(position);

        this.mapManager.addShip(shipmentId, startCoords, {
            icon: '🚢',
            tooltip: tooltip,
            showTooltip: false,
            interactive: true
        });

        // Calculate animation duration (scale with travel time)
        // Default: 8 seconds, but scale based on travelTimeDays
        const baseDuration = 8000;
        const scaleFactor = position.travelTimeDays / 28; // Normalize to ~28 day average
        const duration = baseDuration * scaleFactor;

        // Start animation
        this.mapManager.animateShip(
            shipmentId,
            route.coordinates,
            duration,
            (progress, currentPosition) => {
                // Update tooltip on progress
                this.updateShipTooltip(shipmentId, position, progress);
            },
            () => {
                // Animation complete
                console.log('🏁 Shipment arrived:', shipmentId);
                this.onShipmentArrived(shipmentId);
            }
        );

        // Store shipment data
        this.activeShipments.set(shipmentId, {
            position: position,
            route: route,
            startTime: Date.now(),
            duration: duration,
            status: 'ANIMATING'
        });
    },

    createShipTooltip(position) {
        const eta = position.arrivalTurn - GAME_STATE.currentTurn;
        const etaDays = eta * 30; // Rough estimate

        return `
            <div class="route-tooltip">
                <div class="route-header">${position.originPort} → ${position.destinationPort}</div>
                <div class="route-stat">
                    <span class="route-stat-label">Tonnage:</span>
                    <span class="route-stat-value">${position.tonnage} MT</span>
                </div>
                <div class="route-stat">
                    <span class="route-stat-label">Distance:</span>
                    <span class="route-stat-value">${position.distanceNM} NM</span>
                </div>
                <div class="route-stat">
                    <span class="route-stat-label">Travel Time:</span>
                    <span class="route-stat-value">${position.travelTimeDays.toFixed(1)} days</span>
                </div>
                <div class="route-stat">
                    <span class="route-stat-label">ETA:</span>
                    <span class="route-stat-value">~${etaDays} days</span>
                </div>
                <div class="route-stat">
                    <span class="route-stat-label">Status:</span>
                    <span class="route-stat-value">${position.status}</span>
                </div>
            </div>
        `;
    },

    updateShipTooltip(shipmentId, position, progress) {
        // Update ship tooltip with current progress
        const ship = this.mapManager.ships.get(shipmentId);
        if (ship && ship.marker.getPopup()) {
            const remainingPercent = (1 - progress) * 100;
            const remainingDays = position.travelTimeDays * (1 - progress);

            const updatedTooltip = this.createShipTooltip(position).replace(
                `Status:</span>\n                    <span class="route-stat-value">${position.status}`,
                `Progress:</span>\n                    <span class="route-stat-value">${(progress * 100).toFixed(1)}% (${remainingDays.toFixed(1)}d remaining)`
            );

            ship.marker.getPopup().setHTML(updatedTooltip);
        }
    },

    onShipmentArrived(shipmentId) {
        const shipment = this.activeShipments.get(shipmentId);
        if (!shipment) return;

        // Change route color to completed
        this.mapManager.updateRouteColor(shipmentId, '#10b981'); // Green

        // Remove ship marker
        this.mapManager.removeShip(shipmentId);

        // Update shipment status
        shipment.status = 'ARRIVED';
    },

    onPositionStatusChanged({ position, oldStatus, newStatus }) {
        const shipmentId = position.id;
        const shipment = this.activeShipments.get(shipmentId);
        if (!shipment) return;

        console.log(`📊 Shipment ${shipmentId}: ${oldStatus} → ${newStatus}`);

        if (newStatus === 'ARRIVED') {
            this.onShipmentArrived(shipmentId);
        } else if (newStatus === 'SOLD_PENDING_SETTLEMENT') {
            // Change to yellow/gold to indicate sold but pending
            this.mapManager.updateRouteColor(shipmentId, '#fbbf24');
        }
    },

    loadExistingPositions() {
        // Load all in-transit positions on init
        GAME_STATE.physicalPositions.forEach(position => {
            if (position.status === 'IN_TRANSIT') {
                this.onPositionCreated(position);
            } else if (position.status === 'ARRIVED') {
                // Show completed routes
                const route = this.getRouteForPosition(position);
                if (route) {
                    this.mapManager.addRoute(position.id, route.coordinates, {
                        color: '#10b981',
                        width: 2,
                        opacity: 0.5
                    });
                }
            }
        });

        // Show/hide map based on positions
        if (GAME_STATE.physicalPositions.length > 0) {
            this.showMapSection();
        } else {
            this.hideMapSection();
        }
    },

    updateAllShipments() {
        // Called when turn advances
        // Recalculate ETAs, update tooltips
        this.activeShipments.forEach((shipment, shipmentId) => {
            const position = GAME_STATE.physicalPositions.find(p => p.id === shipmentId);
            if (position) {
                this.updateShipTooltip(shipmentId, position, shipment.progress || 0);
            }
        });
    },

    showMapSection() {
        const section = document.getElementById('maritimeMapSection');
        if (section) section.style.display = 'block';
    },

    hideMapSection() {
        const section = document.getElementById('maritimeMapSection');
        if (section) section.style.display = 'none';
    },

    destroy() {
        if (this.mapManager) {
            this.mapManager.destroy();
        }
        this.activeShipments.clear();
    }
};

export { MaritimeMapWidget };
```

---

## 🔄 ALTERNATIVE INTEGRATION: ACTIVE MAP WIDGET

### Approach

Place maritime visualization in standalone "Active Map" widget instead of Positions widget.

**Pros:**
- Cleaner separation of concerns
- Map can be larger (full widget size)
- Doesn't clutter Positions widget

**Cons:**
- ❌ Less integrated with position data
- ❌ Requires switching between widgets
- ❌ Less immediate visual feedback when purchasing

### Implementation

Same modular approach as Positions integration, but:
1. Create standalone widget in `js/widgets/active-map-widget.js`
2. Add to widget drag-drop system
3. Use same event listeners for real-time updates
4. Provide "View in Map" button in Positions table that switches to Map widget

---

## 📈 MARITIME ROUTES JSON STRUCTURE

### Expected JSON Format

**File:** `data/maritime_routes.json` (CREATE THIS)

```json
{
  "generated": "2025-11-06T15:04:04.524Z",
  "routes": {
    "antofagasta_to_shanghai": {
      "from": "antofagasta",
      "to": "shanghai",
      "coordinates": [
        [-70.38129892695875, -23.681594317000716],
        [-154.0587559353398, 7.918334989102462],
        [-180.29663552068294, 16.17512824531893],
        [121.47, 31.23]
      ]
    },
    "callao_to_shanghai": {
      "from": "callao",
      "to": "shanghai",
      "coordinates": [
        [-77.13932668182368, -12.047655392948982],
        [-229.97753923429357, 28.93250464686099],
        [121.47, 31.23]
      ]
    }
    // ... 22 more routes (24 total)
  }
}
```

### Route Coordinate Extraction

Extract coordinates from `maritime_simulator_complete (4).html` lines 169-470 and save as separate JSON file.

---

## ⚙️ CONFIGURATION & SECURITY

### Mapbox API Token Management

**Current:** Hardcoded in HTML
**Recommended:** Environment config

**Option 1: Config File**

**File:** `js/lib/config.js` (NEW, GITIGNORED)

```javascript
export const CONFIG = {
    MAPBOX_TOKEN: 'pk.eyJ1IjoiamRjbTEwMjAwMSIsImEiOiJjbWhtcTdhNGQyNHlmMnFwcjF3YTF6YmlyIn0.uugX8H3ObKHWL7ia1MBFBg'
};
```

Add to `.gitignore`:
```
js/lib/config.js
```

**Option 2: Keep in maritime-config.js (Current Approach)**

Since Mapbox free tier tokens are domain-restricted and safe for public exposure, keeping in `maritime-config.js` is acceptable.

---

## 🚀 REFACTORING ROADMAP

### Phase 1: Extract Maritime Components (2-3 hours)

**Priority: HIGH**

1. **Create `js/lib/maritime-config.js`**
   - Extract Mapbox token
   - Add port name mappings
   - Add port locations
   - Add port categories

2. **Create `js/lib/maritime-routes.js`**
   - Extract route data from HTML (lines 169-470)
   - Save as JSON or embed as JS module
   - Implement route lookup functions

3. **Create `js/lib/mapbox-manager.js`**
   - Extract core map logic from HTML
   - Convert to class-based module
   - Add route/ship management methods

4. **Create `css/maritime-map.css`**
   - Extract styles from HTML (lines 9-133)
   - Scope to `.maritime-map-section`
   - Remove absolute positioning
   - Add compact mode styles

**Deliverables:**
- 4 new files
- Self-contained maritime modules
- No dependencies on monolithic HTML

---

### Phase 2: Integrate with Positions Widget (2-3 hours)

**Priority: HIGH**

1. **Modify `js/drag-drop/widget-drag.js`**
   - Add map section to Positions widget HTML
   - Initialize MaritimeMapWidget on widget creation

2. **Create `js/widgets/maritime-map-widget.js`**
   - Implement position-specific wrapper
   - Add event listeners for position updates
   - Implement route visualization logic

3. **Modify `js/core/game-state.js`**
   - Add event dispatching after position creation
   - Add `position-created` event
   - Add `position-status-changed` event

4. **Modify `index.html`**
   - Add Mapbox GL CSS link
   - Add maritime-map.css link

**Deliverables:**
- Real-time map updates on position purchase
- Multi-route visualization
- Event-driven architecture

---

### Phase 3: Enhanced Features (Optional, 3-4 hours)

**Priority: MEDIUM**

1. **Progress Tracking**
   - Calculate ship position based on turn progression
   - Show progress bar in tooltip
   - Update ETA dynamically

2. **Interactive Features**
   - Click ship → highlight position in table
   - Click position row → zoom to ship on map
   - Toggle historical routes on/off

3. **Performance Optimization**
   - Lazy-load map only when Positions widget opens
   - Throttle animation updates
   - Add route caching

4. **Mobile Responsiveness**
   - Reduce map height on small screens
   - Simplify tooltips
   - Touch-friendly controls

**Deliverables:**
- Enhanced UX
- Better performance
- Mobile compatibility

---

## 📋 INTEGRATION CHECKLIST

### Pre-Integration (Analysis Phase)

- [x] Analyze maritime simulator structure
- [x] Analyze trading simulator position flow
- [x] Map data structures between systems
- [x] Design event-driven architecture
- [x] Design port name normalization
- [x] Design route lookup strategy
- [ ] **Extract route coordinates to JSON file**
- [ ] **Test route coordinate accuracy**
- [x] **Verify all 24 routes exist in maritime_routes (1).json** ✅
- [ ] **Verify all 24 routes have matching logistics data**

### Phase 1: Module Extraction

- [ ] Create `js/lib/maritime-config.js`
- [ ] Create `js/lib/maritime-routes.js`
- [ ] Create `js/lib/mapbox-manager.js`
- [ ] Create `css/maritime-map.css`
- [ ] Test modules in isolation
- [ ] Verify no circular dependencies

### Phase 2: Widget Integration

- [ ] Modify `js/drag-drop/widget-drag.js`
- [ ] Create `js/widgets/maritime-map-widget.js`
- [ ] Modify `js/core/game-state.js` (add events)
- [ ] Add Mapbox CSS to `index.html`
- [ ] Add maritime CSS to `index.html`
- [ ] Test map initialization
- [ ] Test position creation event
- [ ] Test route rendering
- [ ] Test ship animation

### Phase 3: Data Integration

- [ ] Test port name normalization
- [ ] Verify all route lookups work
- [ ] Test logistics data extraction
- [ ] Test ETA calculations
- [ ] Test turn advancement updates
- [ ] Test position status changes

### Phase 4: UI/UX Polish

- [ ] Style map section to match widget theme
- [ ] Add loading states
- [ ] Add error handling (missing routes)
- [ ] Test with multiple simultaneous positions
- [ ] Test widget resize behavior
- [ ] Test collapsible map section

### Phase 5: Testing & Deployment

- [ ] Test all 24 routes animate correctly
- [ ] Test browser compatibility (Chrome, Firefox, Safari)
- [ ] Test on mobile devices
- [ ] Performance testing (10+ active positions)
- [ ] Error handling edge cases
- [ ] Final code review

---

## 🎯 RECOMMENDED NEXT STEPS

### Immediate Actions (Do First)

1. **Create Maritime Routes JSON**
   - Extract route data from `maritime_simulator_complete (4).html`
   - Save as `data/maritime_routes.json`
   - Validate JSON format

2. **Verify Route-Logistics Alignment**
   - Check that all 24 maritime routes have corresponding logistics data
   - Confirm complete route coverage (all 24 routes present ✅)
   - Validate coordinate accuracy for each route

3. **Set Up Development Branch**
   - Create feature branch: `feature/maritime-map-integration`
   - Keep monolithic HTML as reference
   - Track refactoring progress

### Short-Term (Next 1-2 Days)

4. **Extract Maritime Modules**
   - Start with `maritime-config.js`
   - Then `maritime-routes.js`
   - Then `mapbox-manager.js`
   - Finally `maritime-map.css`

5. **Test Modules Independently**
   - Create test HTML page
   - Initialize map with modules
   - Verify routes render correctly

6. **Implement Event System**
   - Add event dispatching to `game-state.js`
   - Test event firing on position creation
   - Verify event payload structure

### Medium-Term (Next 3-5 Days)

7. **Integrate with Positions Widget**
   - Add map section to widget HTML
   - Initialize MaritimeMapWidget
   - Connect to position events

8. **Test Real-Time Updates**
   - Purchase position → see route appear
   - Advance turn → see ETA update
   - Sell position → see route color change

9. **Polish & Optimize**
   - Style map to match simulator theme
   - Add error handling
   - Optimize animations

---

## 🎨 VISUAL DESIGN MOCKUPS

### Positions Widget with Embedded Map

```
┌───────────────────────────────────────────────────────────┐
│ 📦 PHYSICAL POSITIONS                                     │
├───────────────────────────────────────────────────────────┤
│ 🗺️ Active Shipments                        [Hide Map]    │
├───────────────────────────────────────────────────────────┤
│                                                           │
│      🌍  [Interactive Mapbox Map - 350px height]         │
│                                                           │
│    🚢 → → → → → → →  [Ship #1: CALLAO → SHANGHAI]       │
│                                                           │
│           🚢 → → →  [Ship #2: ANTO → ROTTERDAM]          │
│                                                           │
├───────────────────────────────────────────────────────────┤
│ 🚢 In Transit  ━━ Active  ━━ Completed                   │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ TYPE │ ROUTE            │ TONNAGE │ ETA │ STATUS │ 🗺️   │
│──────┼──────────────────┼─────────┼─────┼────────┼───────│
│ BUY  │ CALLAO→SHANGHAI  │ 5000 MT │ 28d │ ✓      │  ⬆   │
│ BUY  │ ANTO→ROTTERDAM   │ 3000 MT │ 20d │ ✓      │  ⬆   │
│ BUY  │ CALLAO→BUSAN     │ 2000 MT │ 29d │ ✓      │  ⬆   │
└───────────────────────────────────────────────────────────┘
```

### Ship Tooltip on Hover

```
┌────────────────────────────┐
│ CALLAO → SHANGHAI          │
├────────────────────────────┤
│ Tonnage:      5000 MT      │
│ Distance:     9500 NM      │
│ Travel Time:  28.3 days    │
│ Progress:     45.2% (15.5d)│
│ ETA:          Turn 2       │
└────────────────────────────┘
```

---

## ⚠️ CRITICAL CONSIDERATIONS

### 1. Route Availability Matrix

**✅ ALL ROUTES AVAILABLE!**

The `maritime_routes (1).json` file contains **24 complete routes** covering all origin-destination combinations:

| From / To | Shanghai | Busan | Ningbo | Singapore | Rotterdam | Hamburg | Antwerp | Valencia | New Orleans | Houston | Newark | Montreal |
|-----------|----------|-------|--------|-----------|-----------|---------|---------|----------|-------------|---------|--------|----------|
| **Callao** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Antofagasta** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Complete Route List:**

**From Callao (12 routes):**
- callao_to_shanghai
- callao_to_busan
- callao_to_ningbo
- callao_to_singapore
- callao_to_rotterdam
- callao_to_hamburg
- callao_to_antwerp
- callao_to_valencia
- callao_to_neworleans
- callao_to_houston
- callao_to_newark
- callao_to_montreal

**From Antofagasta (12 routes):**
- antofagasta_to_shanghai
- antofagasta_to_busan
- antofagasta_to_ningbo
- antofagasta_to_singapore
- antofagasta_to_rotterdam
- antofagasta_to_hamburg
- antofagasta_to_antwerp
- antofagasta_to_valencia
- antofagasta_to_neworleans
- antofagasta_to_houston
- antofagasta_to_newark
- antofagasta_to_montreal

**Total: 24 routes** - complete coverage for all gameplay scenarios!

### 2. Coordinate System Handling

Some maritime routes cross the antimeridian (date line), using negative longitudes > 180°.

**Example:**
```javascript
// Shanghai coordinates in route data
[-239.73089925720592, 31.27749328048739]  // Should be normalized

// Actual Shanghai coordinates
[121.47, 31.23]
```

**Solution:** Normalize coordinates before use:
```javascript
function normalizeLongitude(lng) {
    while (lng < -180) lng += 360;
    while (lng > 180) lng -= 360;
    return lng;
}
```

### 3. Animation Duration Scaling

Current simulator uses fixed 8-second animation regardless of distance.

**Recommendation:** Scale duration by travel time
```javascript
const baseDuration = 8000; // 8 seconds
const scaleFactor = travelTimeDays / 28; // Normalize to average
const duration = baseDuration * scaleFactor;
```

### 4. Performance with Multiple Routes

**Concern:** 10+ simultaneous animations may impact performance

**Optimizations:**
- Throttle animation updates to 30fps instead of 60fps
- Use `will-change` CSS property on ship markers
- Pause animations when widget is not visible
- Limit to 15 active animations max

### 5. Turn-Based vs Real-Time

**Trade-off:** Game is turn-based (monthly), but map animations are real-time (seconds)

**Design Decision:**
- Keep real-time animations for visual appeal
- Calculate ship progress based on turn progression
- Update ship position when turn advances

---

## 📚 REFERENCE DOCUMENTATION

### Mapbox GL JS

- **API Docs:** https://docs.mapbox.com/mapbox-gl-js/api/
- **Examples:** https://docs.mapbox.com/mapbox-gl-js/example/
- **Markers:** https://docs.mapbox.com/mapbox-gl-js/api/markers/
- **Animation:** https://docs.mapbox.com/mapbox-gl-js/example/animate-point-along-line/

### Trading Simulator Architecture

- **Game State:** `/js/core/game-state.js`
- **Positions Widget:** `/js/widgets/positions-widget.js`
- **Widget System:** `/js/drag-drop/widget-drag.js`
- **Data Files:** `/data/january.js`, `february.js`, etc.

### Custom Events

- **MDN:** https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent

---

## 🎓 CONCLUSION

### Summary

The maritime simulator is **well-architected and ready for integration** with your trading simulator. The preferred approach is embedding the map at the **top of the Positions widget** with real-time event-driven updates.

### Key Integration Points

1. **Event System:** Position purchases trigger `position-created` events
2. **Data Mapping:** Port names normalize to route keys
3. **Logistics Integration:** Travel time/distance from monthly data files
4. **Visual Feedback:** Multi-route display with animated ships
5. **Status Sync:** Map updates when positions change status

### Next Actions

**Phase 1 (Immediate):**
1. Extract maritime routes to JSON file
2. Create maritime configuration module
3. Create Mapbox manager module

**Phase 2 (Short-term):**
4. Add event dispatching to game-state.js
5. Create maritime map widget
6. Integrate with Positions widget

**Phase 3 (Polish):**
7. Test with real position data
8. Add error handling
9. Optimize performance

### Expected Outcome

```
USER PURCHASES COPPER
     ↓
Map appears with route
     ↓
Ship animates along route
     ↓
Tooltip shows distance, ETA
     ↓
Position table updates below
     ↓
Turn advances → ETA updates
     ↓
Ship arrives → route turns green
```

---

**END OF INTEGRATION ANALYSIS**

*This is a READ-ONLY analysis document. No code modifications have been made.*
