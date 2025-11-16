#!/bin/bash

echo "================================"
echo "PROJECT VERIFICATION CHECK"
echo "================================"
echo ""

# Check file structure
echo "✓ Checking file structure..."
echo ""

echo "📁 CSS Files (7 expected):"
ls -1 css/*.css 2>/dev/null | wc -l | xargs echo "   Found:"

echo "📁 Core JS Files (3 expected):"
ls -1 js/core/*.js 2>/dev/null | wc -l | xargs echo "   Found:"

echo "📁 Widget JS Files (2 expected):"
ls -1 js/widgets/*.js 2>/dev/null | wc -l | xargs echo "   Found:"

echo "📁 Drag-Drop JS Files (4 expected):"
ls -1 js/drag-drop/*.js 2>/dev/null | wc -l | xargs echo "   Found:"

echo "📁 Data Files (5 expected):"
ls -1 data/*.js 2>/dev/null | wc -l | xargs echo "   Found:"

echo ""
echo "✓ Checking key imports in index.html..."
echo ""

if grep -q "data/january.js" index.html; then
    echo "   ✓ January data imported"
else
    echo "   ✗ January data NOT imported"
fi

if grep -q "js/init.js" index.html; then
    echo "   ✓ Init module imported"
else
    echo "   ✗ Init module NOT imported"
fi

if grep -q "css/theme.css" index.html; then
    echo "   ✓ CSS files linked"
else
    echo "   ✗ CSS files NOT linked"
fi

echo ""
echo "✓ Checking module exports..."
echo ""

if grep -q "export { GAME_STATE }" js/core/game-state.js; then
    echo "   ✓ GAME_STATE exported"
else
    echo "   ✗ GAME_STATE NOT exported"
fi

if grep -q "export { TradePanel }" js/core/trade-panel.js; then
    echo "   ✓ TradePanel exported"
else
    echo "   ✗ TradePanel NOT exported"
fi

if grep -q "export { MarketsWidget }" js/widgets/markets-widget.js; then
    echo "   ✓ MarketsWidget exported"
else
    echo "   ✗ MarketsWidget NOT exported"
fi

echo ""
echo "✓ Checking module imports in init.js..."
echo ""

if grep -q "import { GAME_STATE }" js/init.js; then
    echo "   ✓ GAME_STATE imported"
else
    echo "   ✗ GAME_STATE NOT imported"
fi

if grep -q "import { TradePanel }" js/init.js; then
    echo "   ✓ TradePanel imported"
else
    echo "   ✗ TradePanel NOT imported"
fi

if grep -q "import { MarketsWidget }" js/init.js; then
    echo "   ✓ MarketsWidget imported"
else
    echo "   ✗ MarketsWidget NOT imported"
fi

echo ""
echo "✓ Checking month data access..."
echo ""

if grep -q "window.JANUARY_DATA" js/core/game-state.js; then
    echo "   ✓ Month data accessed via window object"
else
    echo "   ✗ Month data NOT accessed via window object"
fi

echo ""
echo "================================"
echo "VERIFICATION COMPLETE"
echo "================================"
echo ""
echo "To test the app:"
echo "1. Run: python3 -m http.server 8000"
echo "2. Open browser to the port shown"
echo "3. Check browser console (F12) for errors"
echo "4. Click a TRADE button to test"
echo ""
