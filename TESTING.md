# Testing Checklist

## ✅ All Files Connected Properly!

Run `./verify.sh` to check file structure - all checks should pass.

## Browser Testing Steps

### 1. Start the Server
```bash
python3 -m http.server 8000
```

### 2. Open in Browser
- Click "Open in Browser" when Codespace prompts
- Or go to Ports tab and open port 8000

### 3. Check Browser Console (Press F12)

**Should see:**
- ✅ No red errors
- ✅ "Markets" widget loaded in Panel B
- ✅ Header showing game stats

**Should NOT see:**
- ❌ "GAME_STATE is not defined"
- ❌ "JANUARY_DATA not loaded"
- ❌ "Cannot read properties of undefined"
- ❌ Any 404 errors for .js or .css files

### 4. Test Basic Functionality

**✅ Theme Toggle:**
- Click "☀️ Light Mode" button
- Page should switch to light theme
- Button should change to "🌙 Dark Mode"

**✅ Sidebar:**
- Click the `◀` button
- Sidebar should collapse
- Click again to expand

**✅ Markets Widget:**
- Should see 3 suppliers (CALLAO LTA, CALLAO SPOT, ANTOFAGASTA)
- Should see 3 buyers (AMERICAS, ASIA, EUROPE)
- Each row should have a "TRADE" button

### 5. Test Trade Buttons

**✅ Buy Trade:**
1. Click any "TRADE" button in the Suppliers section
2. A blue popup panel should appear (500x500px)
3. Should show:
   - Supplier name
   - Port info
   - Tonnage input field
   - Destination dropdown (populated with ports)
   - Exchange selection (LME/COMEX)
   - Shipping terms (FOB/CIF)
   - Cost breakdown
   - "PURCHASE COPPER" button

**✅ Interactive Elements:**
- Change tonnage → cost should update
- Select destination → freight cost should update
- Click FOB/CIF → price should change
- Click LME/COMEX → price should change

**✅ Execute Trade:**
1. Fill in all required fields
2. Click "PURCHASE COPPER"
3. Should see success alert
4. Panel should close
5. Header should update (funds, LOC used)

**✅ Sell Trade:**
1. First execute a buy trade (need inventory)
2. Click "TRADE" in Buyers section
3. Green panel should appear
4. Select inventory from dropdown
5. Enter tonnage
6. Click "SELL COPPER"
7. Should see success alert with profit/loss

### 6. Test Drag & Drop

**✅ Widget Dragging:**
- Drag "Positions" from sidebar to an empty panel
- Should create new panel with Positions widget

**✅ Panel Resizing:**
- Drag the divider between panels
- Panels should resize

**✅ Panel Dragging (Trade Panels):**
- Open a trade panel
- Click and drag the header
- Panel should move around

### 7. Test Next Turn

**✅ Advance Turn:**
1. Click "NEXT TURN ▶" button
2. Should see confirmation dialog
3. Click OK
4. Should advance to February
5. Header should update
6. Markets widget should refresh with new data

## Common Issues & Fixes

### Issue: Blank page
**Check:**
- Browser console for errors
- Network tab for 404s
- Make sure you're using `index.html`, not the old file

### Issue: "GAME_STATE is not defined"
**Fix:**
- Run: `git reset --hard 62b700a`
- Refresh browser

### Issue: Trade buttons don't work
**Check:**
- Browser console for errors
- Make sure event listeners are attached (check init.js)

### Issue: No data showing
**Check:**
- Data files loaded in index.html
- window.JANUARY_DATA exists (type in console: `window.JANUARY_DATA`)

## Quick Console Tests

Open browser console (F12) and type:

```javascript
// Check if modules loaded
window.GAME_STATE
// Should show object with currentTurn, practiceFunds, etc.

window.TradePanel
// Should show object with init, openBuy, openSell methods

window.JANUARY_DATA
// Should show object with TURN: 1, MONTH: "January", etc.

// Check if widgets initialized
window.MarketsWidget
// Should be undefined (not exposed globally, which is correct)

// Check state
GAME_STATE.currentMonthData
// Should show January data

GAME_STATE.practiceFunds
// Should show 200000
```

## All Tests Pass? ✅

If all the above works, your app is fully connected and functional!

You can now:
- ✅ Buy copper from suppliers
- ✅ Sell copper to clients
- ✅ Track positions
- ✅ Advance through months
- ✅ See P&L calculations
- ✅ Use drag & drop interface
