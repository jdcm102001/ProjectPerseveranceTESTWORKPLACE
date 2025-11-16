# CLAUDE.md - Project Perseverance Trading Simulator

## Project Overview

**Project Name:** Project Perseverance Trading Simulator
**Type:** Browser-based Educational Trading Simulation
**Technology Stack:** Vanilla JavaScript, HTML5, CSS3
**Domain:** Commodity Trading (Copper Market Simulation)

This is a single-page web application that simulates commodity trading operations for copper, focusing on physical trading between South American suppliers (Peru and Chile) and global markets (Americas, Asia, Europe). The simulator runs turn-based gameplay across multiple months with realistic market dynamics, pricing mechanisms, and logistics.

## Repository Structure

```
ProjectPerseveranceTESTWORKPLACE/
├── trading_simulator_updated (4).html  # Main application file (~34K lines)
├── gameState (2).js                     # Core state management module
├── january.js                           # January market data
├── february.js                          # February market data
├── march.js                             # March market data
├── april.js                             # April market data
└── .git/                                # Git repository
```

### File Descriptions

#### 1. `trading_simulator_updated (4).html`
- **Size:** ~127KB, 34,000+ lines
- **Purpose:** Main application containing all UI, game logic, and styling
- **Key Sections:**
  - Header with game metrics (Funds, LOC, P&L, Turn)
  - Collapsible sidebar with draggable widgets
  - Multi-panel workspace with tabs
  - Trading interfaces for physical and futures positions
  - Dark/Light theme support
  - Complete game logic embedded in `<script>` tags

#### 2. `gameState (2).js`
- **Size:** 463 lines
- **Purpose:** Central state management module
- **Key Features:**
  - Game state persistence via localStorage
  - Position tracking (physical and futures)
  - P&L calculation (realized and unrealized)
  - Transaction history management
  - Turn advancement logic
  - Trade validation
  - Import/Export functionality

#### 3. Month Data Files (`january.js`, `february.js`, `march.js`, `april.js`)
- **Structure:** JavaScript objects with market data
- **Contains:**
  - Market depth (supply/demand)
  - LME and COMEX pricing curves
  - Freight rates between origin/destination ports
  - Supplier rules and premiums
  - Client opportunities by region
  - Fixed game rules (cost of carry, financing rates)

## Core Game Mechanics

### Game State
- **Starting Capital:** $200,000 practice funds
- **Line of Credit (LOC):** $200,000 limit
- **Turns:** 4 turns (January through April)
- **Currencies:** USD
- **Exchanges:** LME (London Metal Exchange), COMEX (Commodity Exchange)

### Trading Types

1. **Physical Trading**
   - Buy from suppliers (Peruvian LTA, Peruvian Spot, Chilean Spot)
   - Sell to regional clients (Americas, Asia, Europe)
   - Shipping terms: FOB or CIF
   - Pricing basis: M+1 settlement (month following sailing date)
   - Includes freight costs, supplier premiums, regional premiums

2. **Futures Trading**
   - LME futures contracts only
   - Long/Short positions
   - Contracts: 1M, 3M, 12M
   - Margin requirements apply
   - Used for hedging or speculation

### Pricing Structure
- **Supplier Pricing:** LME/COMEX M+1 + Supplier Premium
- **Client Pricing:** LME/COMEX M+1 + Regional Premium
- **Cost of Carry:** 0.46% monthly rate, 2-month financing period
- **Freight:** Varies by origin port, destination port, and shipping terms

### Key Data Structures

#### Physical Position
```javascript
{
  id: string,
  type: 'PHYSICAL',
  supplier: string,
  originPort: string,
  destinationPort: string,
  tonnage: number,
  exchange: 'LME' | 'COMEX',
  basePrice: number,
  supplierPremium: number,
  freightCost: number,
  shippingTerms: 'FOB' | 'CIF',
  costPerMT: number,
  totalCost: number,
  status: 'OPEN' | 'CLOSED',
  qpMonth: string
}
```

#### Futures Position
```javascript
{
  id: string,
  type: 'FUTURES',
  exchange: 'LME',
  direction: 'LONG' | 'SHORT',
  tonnage: number,
  entryPrice: number,
  contract: '1M' | '3M' | '12M',
  status: 'OPEN' | 'CLOSED',
  marginRequired: number
}
```

## Development Guidelines for AI Assistants

### Code Style and Conventions

1. **JavaScript Style**
   - Uses ES6+ features (const, let, arrow functions, template literals)
   - Object-oriented approach with singleton pattern (GameStateManager)
   - Data stored as constant objects (JANUARY_DATA, etc.)
   - Window object for global state management

2. **Naming Conventions**
   - Constants: UPPER_SNAKE_CASE (e.g., `JANUARY_DATA`, `LME_PRICE`)
   - Variables: camelCase (e.g., `currentTurn`, `physicalPositions`)
   - Functions: camelCase with descriptive names (e.g., `addPhysicalPosition`)
   - IDs: PREFIX_timestamp_random (e.g., `PHYS_1234567890_abc123`)

3. **Data Organization**
   - Month data: Separate files for each turn
   - State management: Centralized in GameStateManager
   - UI logic: Embedded in HTML file
   - Persistence: localStorage for game state

### Making Changes

#### Adding New Month Data
1. Create new file: `{month}.js`
2. Follow existing structure with required sections:
   - TURN, MONTH
   - MARKET_DEPTH (SUPPLY, DEMAND)
   - PRICING (LME, COMEX, M_PLUS_1)
   - LOGISTICS (FREIGHT_RATES)
   - FIXED_RULES
   - CLIENTS
3. Update `monthDataMap` in `gameState (2).js`
4. Include script tag in HTML header

#### Modifying Game Mechanics
- **State changes:** Edit `gameState (2).js`
- **UI changes:** Edit `trading_simulator_updated (4).html`
- **Market data:** Edit respective month files
- **Always test:** Use browser console for debugging

#### Testing Changes
1. Open `trading_simulator_updated (4).html` in browser
2. Check browser console for errors
3. Test state persistence (localStorage)
4. Verify calculations (P&L, freight, pricing)
5. Test across turns (month progression)

### Common Operations

#### Calculate Total Position Cost
```javascript
totalCost = (basePrice + supplierPremium + freightCost) * tonnage
```

#### Calculate Sale P&L
```javascript
salePrice = basePrice + regionalPremium
revenue = salePrice * tonnage
profit = revenue - (costPerMT * tonnage)
```

#### Validate Trade
```javascript
buyingPower = practiceFunds + (locLimit - locUsed)
isValid = totalCost <= buyingPower
```

### Important Constants

- **Origin Ports:** CALLAO (Peru), ANTOFAGASTA (Chile)
- **Destination Ports:** SHANGHAI, BUSAN, NINGBO, SINGAPORE, ROTTERDAM, VALENCIA, HAMBURG, ANTWERP, NEW_ORLEANS, HOUSTON, NEWARK, MONTREAL
- **Regions:** AMERICAS, ASIA, EUROPE
- **Exchanges:** LME, COMEX
- **Shipping Terms:** FOB, CIF
- **Supplier Types:** PERUVIAN (LTA), PERUVIAN (Spot), CHILEAN (Spot), Flash Sale

### State Management

#### Persistence
- Uses localStorage key: `tradingSimulatorState`
- Saved automatically after transactions
- Can export/import as JSON

#### Key State Properties
- `currentTurn`: 1-4 (January-April)
- `practiceFunds`: Available cash
- `locUsed`: Line of credit utilized
- `physicalPositions`: Array of open/closed physical trades
- `futuresPositions`: Array of open/closed futures contracts
- `realizedPL`: Closed position profits
- `unrealizedPL`: Mark-to-market of open positions
- `transactions`: Historical record of all trades

### UI Architecture

#### Layout Structure
```
├── Header Bar (Fixed)
│   ├── Metrics (Funds, LOC, P&L, Turn)
│   ├── Theme Toggle
│   └── Next Turn Button
├── Container
│   ├── Sidebar (Collapsible)
│   │   └── Widget List (Draggable)
│   └── Workspace
│       └── Panel Zones (with Tabs)
```

#### Theme System
- CSS custom properties (CSS variables)
- Two themes: dark (default) and light
- Toggle via `[data-theme="light"]` attribute
- Persisted preference

### Error Handling

1. **Trade Validation**
   - Check buying power before purchase
   - Validate tonnage limits
   - Ensure position exists before closing

2. **State Errors**
   - Graceful fallback if localStorage fails
   - Console error logging
   - User-friendly alerts

3. **Data Errors**
   - Check for missing month data
   - Validate freight route existence
   - Handle undefined values

### Performance Considerations

1. **Large HTML File**
   - The main HTML file is very large (~34K lines)
   - Consider code splitting if adding significant features
   - Minimize DOM manipulation

2. **State Updates**
   - Batch state updates when possible
   - Save to localStorage only after complete transactions
   - Avoid unnecessary re-renders

### Git Workflow

- **Branch:** `claude/claude-md-mi11jkf2u11u5d07-016n39ueUGsNozNQw5FCihwE`
- **Main branch:** (not specified, likely 'main' or 'master')
- **Commit style:** Descriptive messages

### Testing Checklist

When making changes, verify:
- [ ] Game state persists correctly
- [ ] P&L calculations are accurate
- [ ] LOC usage updates properly
- [ ] Freight costs calculate correctly
- [ ] Position IDs are unique
- [ ] Turn advancement works
- [ ] Theme toggle functions
- [ ] Export/Import preserves state
- [ ] Browser console has no errors
- [ ] UI remains responsive

## Domain Knowledge

### Commodity Trading Terms

- **LTA (Long-Term Agreement):** Fixed tonnage commitment with supplier
- **Spot:** One-time purchase at current market price
- **M+1 Pricing:** Pricing based on the month following sailing/delivery
- **FOB (Free On Board):** Buyer pays freight from origin port
- **CIF (Cost, Insurance, Freight):** Seller pays freight to destination
- **Contango:** Futures prices higher than spot (carrying costs)
- **MT (Metric Ton):** Standard unit for copper trading
- **Premium:** Price addition to base exchange price
- **Cost of Carry:** Financing cost for holding inventory
- **Mark-to-Market:** Valuing positions at current market prices

### Market Dynamics

1. **Supply:** Peruvian and Chilean copper producers
2. **Demand:** Regional consumption (Americas, Asia, Europe)
3. **Pricing:** LME (global) and COMEX (US) exchanges
4. **Logistics:** Ocean freight between South America and destination markets
5. **Risk:** Price volatility, freight rates, demand fluctuations

## File Modification Guidelines

### DO
- Test changes locally in browser before committing
- Maintain data structure consistency across month files
- Update GameStateManager when adding new state properties
- Preserve existing ID generation patterns
- Keep CSS variables for theming
- Document complex calculations with comments
- Use descriptive variable names

### DON'T
- Modify month data without understanding pricing formulas
- Break localStorage compatibility (migration needed)
- Remove existing validation logic
- Change ID patterns (breaks position tracking)
- Hard-code values that should be data-driven
- Remove error handling without replacement
- Alter core game rules without comprehensive testing

## Debugging Tips

1. **Browser DevTools:**
   - Console: Check for JavaScript errors
   - Application → Local Storage: Inspect game state
   - Network: Verify script loading
   - Elements: Inspect UI rendering

2. **Common Issues:**
   - **Positions not showing:** Check ID generation
   - **Incorrect P&L:** Verify cost calculation formulas
   - **State not persisting:** Check localStorage quota
   - **Freight errors:** Verify port names match data exactly
   - **Month data missing:** Check script load order in HTML

3. **Testing Tools:**
   ```javascript
   // Access state in browser console
   GameStateManager.state

   // View current month data
   GameStateManager.currentMonthData

   // Export for debugging
   GameStateManager.exportGameData()
   ```

## Future Enhancement Suggestions

1. **Code Organization**
   - Extract JavaScript from HTML into separate files
   - Modularize UI components
   - Create separate trading logic module

2. **Features**
   - Additional turns/months beyond April
   - More sophisticated futures strategies
   - Risk metrics dashboard
   - Performance analytics
   - Multi-player competitive mode

3. **Data**
   - Dynamic market events
   - Variable freight rates
   - Currency exchange rates
   - More granular port options

4. **UX Improvements**
   - Tutorial/onboarding
   - Trade suggestions/hints
   - Chart visualizations
   - Mobile responsiveness

## Quick Reference

### Key Functions in GameStateManager

| Function | Purpose |
|----------|---------|
| `init()` | Initialize and load saved state |
| `addPhysicalPosition(position)` | Create new physical trade |
| `closePhysicalPosition(id, details)` | Sell physical position |
| `addFuturesPosition(position)` | Open futures contract |
| `closeFuturesPosition(id, price)` | Close futures contract |
| `advanceMonth()` | Progress to next turn |
| `validateTrade(cost)` | Check if trade is affordable |
| `getFreightCost(origin, dest, terms)` | Calculate shipping cost |
| `saveState()` | Persist to localStorage |
| `resetGame()` | Clear all state and restart |
| `exportGameData()` | Download state as JSON |

### Month Data Access Pattern

```javascript
// In month files
const JANUARY_DATA = { ... }

// In GameStateManager
monthDataMap: {
  1: 'JANUARY_DATA',
  2: 'FEBRUARY_DATA',
  3: 'MARCH_DATA',
  4: 'APRIL_DATA'
}

// Current month access
this.currentMonthData = window[this.monthDataMap[this.state.currentTurn]]
```

---

**Last Updated:** 2025-11-16
**For Questions:** Review code comments and console.log statements in source files
