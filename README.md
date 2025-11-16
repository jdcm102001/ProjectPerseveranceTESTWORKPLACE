# Trading Simulator - Modular Architecture

This project has been refactored into a clean, modular architecture with separated concerns.

## Project Structure

```
ProjectPerseveranceTESTWORKPLACE/
├── index.html                          # Main HTML file
├── README.md                           # This file
├── CLAUDE.md                          # AI assistant documentation
│
├── css/                               # Stylesheets
│   ├── reset.css                      # CSS reset
│   ├── theme.css                      # Theme variables (dark/light)
│   ├── layout.css                     # Layout (header, sidebar, container)
│   ├── panels.css                     # Panel system (workspace, dividers)
│   ├── markets-widget.css             # Markets widget styles
│   ├── trade-panel.css                # Buy/sell trade panel styles
│   └── positions-widget.css           # Positions widget styles
│
├── js/                                # JavaScript modules
│   ├── init.js                        # Application initialization
│   │
│   ├── core/                          # Core game logic
│   │   ├── game-state.js              # Central game state management
│   │   ├── trade-panel.js             # Trade panel logic (buy/sell)
│   │   └── game-controls.js           # UI controls (next turn, theme toggle)
│   │
│   ├── widgets/                       # Widget components
│   │   ├── markets-widget.js          # Markets table widget
│   │   └── positions-widget.js        # Positions tracking widget
│   │
│   └── drag-drop/                     # Drag and drop functionality
│       ├── drag-state.js              # Shared drag state
│       ├── widget-drag.js             # Widget dragging from sidebar
│       ├── tab-drag.js                # Tab dragging between panels
│       └── panel-resize.js            # Panel resizing with dividers
│
├── data/                              # Game data files
│   ├── gameState (2).js               # GameStateManager (legacy)
│   ├── january.js                     # January market data
│   ├── february.js                    # February market data
│   ├── march.js                       # March market data
│   └── april.js                       # April market data
│
└── trading_simulator_updated (4).html # Original monolithic file (deprecated)
```

## Architecture Overview

### CSS Modules

The CSS has been split into 7 focused files:

1. **reset.css** - Basic CSS reset for consistent cross-browser rendering
2. **theme.css** - CSS custom properties for dark/light themes
3. **layout.css** - Main layout structure (header, sidebar, container)
4. **panels.css** - Panel system, tabs, dividers, and drag preview
5. **markets-widget.css** - Styling for the markets widget tables
6. **trade-panel.css** - Styling for the draggable buy/sell panels
7. **positions-widget.css** - Styling for the positions tracking widget

### JavaScript Modules

All JavaScript has been converted to ES6 modules with proper imports/exports:

#### Core Logic (`js/core/`)

- **game-state.js** - Manages all game state including funds, positions, P&L, and header updates
- **trade-panel.js** - Handles buy/sell panel UI, calculations, and trade execution
- **game-controls.js** - UI control functions (advanceTurn, toggleTheme, etc.)

#### Widgets (`js/widgets/`)

- **markets-widget.js** - Displays suppliers and buyers in table format
- **positions-widget.js** - Tracks open positions and matches buy/sell pairs

#### Drag & Drop (`js/drag-drop/`)

- **drag-state.js** - Shared state for drag operations (widgets, tabs, panels)
- **widget-drag.js** - Widget dragging from sidebar to panels
- **tab-drag.js** - Tab management and dragging between panels
- **panel-resize.js** - Panel resizing via divider dragging

#### Initialization (`js/init.js`)

- Imports all necessary modules
- Initializes game state and widgets
- Sets up all event listeners
- Loads saved theme preference

### Data Files (`data/`)

- **Month data files** (january.js - april.js): Market data, pricing, freight rates, suppliers, clients
- **gameState (2).js**: Legacy GameStateManager (contains persistence logic)

## How It Works

### Application Startup

1. **HTML loads** (`index.html`)
2. **Data files load** (month data + GameStateManager)
3. **CSS loads** (all 7 stylesheets)
4. **Main module loads** (`js/init.js` as type="module")
5. **Initialization runs**:
   - Import all modules
   - Initialize GAME_STATE
   - Initialize MarketsWidget
   - Initialize TradePanel
   - Attach event listeners
   - Setup drag & drop
   - Load saved theme

### Module Dependencies

```
init.js
  ├── core/game-state.js
  ├── core/trade-panel.js
  ├── core/game-controls.js
  ├── widgets/markets-widget.js
  ├── widgets/positions-widget.js (imported by game-state)
  ├── drag-drop/drag-state.js
  ├── drag-drop/widget-drag.js
  │     └── imports: drag-state, tab-drag
  ├── drag-drop/tab-drag.js
  │     └── imports: drag-state, widget-drag
  └── drag-drop/panel-resize.js
        └── imports: drag-state
```

### Global Exposure

For compatibility with inline event handlers in HTML, the following are exposed globally:

- `window.GAME_STATE`
- `window.TradePanel`
- `window.advanceTurn`
- `window.toggleSidebar`
- `window.toggleTheme`
- `window.showSaleDetails`
- `window.closeSaleDetails`
- `window.closeWidget`

## Development

### Running the Application

Simply open `index.html` in a modern web browser that supports ES6 modules.

**Note:** Due to CORS restrictions, you may need to run a local HTTP server:

```bash
# Python 3
python -m http.server 8000

# Node.js (with http-server package)
npx http-server -p 8000

# Then open: http://localhost:8000
```

### Adding New Features

#### Adding a New Widget

1. Create `js/widgets/my-widget.js`:
   ```javascript
   const MyWidget = {
       init() {
           // Initialize widget
       }
   };

   export { MyWidget };
   ```

2. Add styles in `css/my-widget.css`

3. Import in `js/init.js`:
   ```javascript
   import { MyWidget } from './widgets/my-widget.js';
   ```

4. Initialize in DOMContentLoaded:
   ```javascript
   MyWidget.init();
   ```

5. Link CSS in `index.html`:
   ```html
   <link rel="stylesheet" href="css/my-widget.css">
   ```

#### Adding New Month Data

1. Create `data/may.js` following the structure of existing month files
2. Import in `index.html`:
   ```html
   <script src="data/may.js"></script>
   ```
3. Update `GAME_STATE.currentMonthData` logic to handle month 5

### Code Style

- Use ES6 syntax (const, let, arrow functions, modules)
- Use ES6 modules with explicit imports/exports
- Keep modules focused on single responsibility
- Use descriptive variable and function names
- Add comments for complex logic

## Migration Notes

### Changes from Original

The original `trading_simulator_updated (4).html` was a single 3200-line file containing:
- All HTML structure
- All CSS (1113 lines)
- All JavaScript (1755 lines)

This has been broken down into:
- 1 HTML file (index.html)
- 7 CSS files (modular and maintainable)
- 9 JavaScript modules (ES6 with imports/exports)
- 5 Data files (month data + game state)

### Benefits

1. **Maintainability** - Easier to find and modify specific functionality
2. **Reusability** - Modules can be imported where needed
3. **Testability** - Individual modules can be tested in isolation
4. **Performance** - Browser can cache separate files
5. **Collaboration** - Multiple developers can work on different modules
6. **Debugging** - Easier to identify source of issues
7. **Scalability** - New features can be added as separate modules

## Browser Compatibility

Requires a modern browser with support for:
- ES6 modules (import/export)
- ES6 syntax (const, let, arrow functions, template literals)
- CSS custom properties (CSS variables)
- localStorage
- Drag and Drop API

Tested in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

See project license.

## Contributing

When contributing, please:
1. Follow the existing module structure
2. Add new features as separate modules when appropriate
3. Update this README if adding new directories or major features
4. Test in multiple browsers
5. Keep modules focused on single responsibility

---

For AI assistant guidance, see [CLAUDE.md](./CLAUDE.md)
