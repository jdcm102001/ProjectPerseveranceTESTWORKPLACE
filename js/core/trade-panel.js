import { GAME_STATE } from './game-state.js';
import { TimeManager } from './time-manager.js';
import { PositionsWidget } from '../widgets/positions-widget.js';
import { MarketsWidget } from '../widgets/markets-widget.js';
import { ExposureWarnings } from '../utils/exposure-warnings.js';

const TradePanel = {
    currentTrade: {},
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,

    init() {
        const buyHeader = document.getElementById('buyPanelHeader');
        const sellHeader = document.getElementById('sellPanelHeader');

        // Drag handlers - ONLY on mousedown, don't interfere with clicks
        if (buyHeader) {
            buyHeader.addEventListener('mousedown', (e) => {
                // Don't start drag if clicking on buttons
                if (e.target.tagName === 'BUTTON') return;
                this.startDrag(e, 'buyPanel');
            });
        }

        if (sellHeader) {
            sellHeader.addEventListener('mousedown', (e) => {
                // Don't start drag if clicking on buttons
                if (e.target.tagName === 'BUTTON') return;
                this.startDrag(e, 'sellPanel');
            });
        }

        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDrag());

        // Input change listeners ONLY (buttons use inline onclick)
        document.getElementById('buyTonnage')?.addEventListener('input', () => this.calculateBuy());
        document.getElementById('buyDestination')?.addEventListener('change', () => this.calculateBuy());
        document.getElementById('sellInventory')?.addEventListener('change', () => this.calculateSell());
        document.getElementById('sellTonnage')?.addEventListener('input', () => this.calculateSell());
    },

    startDrag(e, panelId) {
        if (e.target.classList.contains('trade-panel-close')) return;

        this.isDragging = true;
        this.dragPanel = document.getElementById(panelId);

        const rect = this.dragPanel.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;
    },

    drag(e) {
        if (!this.isDragging) return;

        const x = e.clientX - this.dragOffsetX;
        const y = e.clientY - this.dragOffsetY;

        this.dragPanel.style.left = `${x}px`;
        this.dragPanel.style.top = `${y}px`;
    },

    stopDrag() {
        this.isDragging = false;
    },

    openBuy(supplier, port, minMT, maxMT, basis, premium, isLTA) {
        this.currentTrade = { type: 'BUY', supplier, port, minMT, maxMT, basis, premium, isLTA };

        document.getElementById('buySupplier').textContent = supplier;
        document.getElementById('buyPort').textContent = port;
        document.getElementById('buyBasis').textContent = basis ? (basis.replace('_', ' / ') + ' M+1') : 'LME M+1';
        document.getElementById('buyPremium').textContent = premium > 0 ? `+$${premium}/MT` : '$0/MT';
        document.getElementById('buyRange').textContent = `Range: ${minMT} - ${maxMT} MT`;
        document.getElementById('buyTonnage').min = minMT;
        document.getElementById('buyTonnage').max = maxMT;
        document.getElementById('buyTonnage').value = minMT;

        document.getElementById('buyExchangeGroup').style.display = isLTA ? 'none' : 'block';

        this.populateDestinations(supplier);
        this.centerPanel('buyPanel');
        document.getElementById('buyPanel').classList.add('active');
        this.calculateBuy();
    },

    openSell(buyer, dest, minMT, maxMT, exchange, premium) {
        this.currentTrade = { type: 'SELL', buyer, dest, minMT, maxMT, exchange, premium };

        document.getElementById('sellBuyer').textContent = buyer;
        document.getElementById('sellDest').textContent = dest;
        document.getElementById('sellExchange').textContent = exchange;
        document.getElementById('sellPremium').textContent = `+$${premium}/MT`;
        document.getElementById('sellRange').textContent = `Range: ${minMT} - ${maxMT} MT`;
        document.getElementById('sellTonnage').min = minMT;
        document.getElementById('sellTonnage').max = maxMT;
        document.getElementById('sellTonnage').value = minMT;

        this.populateInventory();
        this.centerPanel('sellPanel');
        document.getElementById('sellPanel').classList.add('active');
        this.calculateSell();
    },

    close() {
        document.getElementById('buyPanel').classList.remove('active');
        document.getElementById('sellPanel').classList.remove('active');
    },

    centerPanel(panelId) {
        const panel = document.getElementById(panelId);
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        panel.style.left = `${(windowWidth - 500) / 2}px`;
        panel.style.top = `${(windowHeight - 500) / 2}px`;
    },

    selectExchange(exchange, event) {
        document.querySelectorAll('#buyExchangeGroup .radio-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        if (event) {
            event.currentTarget.classList.add('selected');
        }
        document.querySelector(`input[name="exchange"][value="${exchange}"]`).checked = true;
        this.calculateBuy();
    },

    selectShipping(terms) {
        document.querySelectorAll('[id$="Option"]').forEach(opt => {
            opt.classList.remove('selected');
        });
        document.getElementById(terms.toLowerCase() + 'Option').classList.add('selected');
        document.querySelector(`input[name="shippingTerms"][value="${terms}"]`).checked = true;
        this.calculateBuy();
    },

    populateDestinations(supplier) {
        const monthData = GAME_STATE.currentMonthData;
        const select = document.getElementById('buyDestination');

        const originKey = supplier.toUpperCase();
        const freightData = monthData.LOGISTICS.FREIGHT_RATES[originKey];

        if (!freightData) {
            select.innerHTML = '<option value="">No routes available</option>';
            return;
        }

        const destinations = Object.keys(freightData).map(key => {
            const route = freightData[key];
            return `<option value="${key}">${route.PORT_NAME}, ${route.COUNTRY}</option>`;
        }).join('');

        select.innerHTML = '<option value="">Select destination...</option>' + destinations;

        if (Object.keys(freightData).length > 0) {
            select.value = Object.keys(freightData)[0];
        }
    },

    populateInventory() {
        const select = document.getElementById('sellInventory');
        const destinationPort = this.currentTrade.dest; // Destination port for this sale

        if (GAME_STATE.physicalPositions.length === 0) {
            select.innerHTML = '<option value="none">-- No inventory available --</option>';
            return;
        }

        // CRITICAL FIX: Only show inventory going to the SAME destination port
        // Filter by: 1) matching destinationPort, 2) not already sold
        const matchingPositions = GAME_STATE.physicalPositions
            .map((pos, index) => ({ pos, index }))
            .filter(({ pos }) => {
                // Must match destination port AND not be sold already
                // Both buy and sell use M+1 pricing (QP implicit match)
                return pos.destinationPort === destinationPort && !pos.soldInfo;
            });

        if (matchingPositions.length === 0) {
            select.innerHTML = `<option value="none">-- No cargo going to ${destinationPort} --</option>`;
            return;
        }

        const options = matchingPositions.map(({ pos, index }) => {
            return `<option value="${index}">${pos.tonnage}MT from ${pos.supplier} → ${pos.destinationPort} @ $${Math.round(pos.costPerMT)}/MT</option>`;
        }).join('');

        select.innerHTML = '<option value="none">Select inventory...</option>' + options;
    },

    calculateBuy() {
        const tonnage = parseFloat(document.getElementById('buyTonnage').value) || 5;
        const exchange = document.querySelector('input[name="exchange"]:checked').value;
        const shippingTerms = document.querySelector('input[name="shippingTerms"]:checked').value;
        const destinationKey = document.getElementById('buyDestination').value;

        if (!destinationKey) return;

        const monthData = GAME_STATE.currentMonthData;
        const supplier = this.currentTrade.supplier;
        const premium = this.currentTrade.premium || 0;

        // Use M+1 quotational pricing for physical trades (not spot)
        const basePrice = exchange === 'LME' ? monthData.PRICING.M_PLUS_1.LME_AVG : monthData.PRICING.M_PLUS_1.COMEX_AVG;

        const originKey = supplier.toUpperCase();
        const freightData = monthData.LOGISTICS.FREIGHT_RATES[originKey][destinationKey];
        const fobFreight = freightData.FOB_RATE_USD_PER_TONNE;
        const cifFreight = freightData.CIF_RATE_USD_PER_TONNE;

        const fobPrice = basePrice + premium + fobFreight;
        const cifPrice = basePrice + premium + cifFreight;
        const selectedPrice = shippingTerms === 'FOB' ? fobPrice : cifPrice;
        const totalCost = selectedPrice * tonnage;

        document.getElementById('fobPriceDisplay').textContent = `$${Math.round(fobPrice).toLocaleString('en-US')}/MT`;
        document.getElementById('cifPriceDisplay').textContent = `$${Math.round(cifPrice).toLocaleString('en-US')}/MT`;

        document.getElementById('buyBasePrice').textContent = `$${Math.round(basePrice).toLocaleString('en-US')}/MT`;
        document.getElementById('buySupplierPremium').textContent = premium > 0 ? `+$${premium}/MT` : '$0/MT';
        document.getElementById('buyFreight').textContent = `$${Math.round(shippingTerms === 'FOB' ? fobFreight : cifFreight)}/MT (${shippingTerms})`;
        document.getElementById('buyPricePerMT').textContent = `$${Math.round(selectedPrice).toLocaleString('en-US')}/MT`;
        document.getElementById('buyTotalCost').textContent = `$${Math.round(totalCost).toLocaleString('en-US')}`;

        // Calculate M+2 settlement period
        const settlement = TimeManager.calculateSettlement(GAME_STATE.currentMonth, GAME_STATE.currentPeriod);
        const settlementDisplay = TimeManager.formatPeriod(settlement.settlementMonth, settlement.settlementPeriod);

        // M+1 is always next month (regardless of current period)
        const qpMonth = TimeManager.getMonthName(GAME_STATE.currentMonth + 1);

        document.getElementById('buyQPWarning').textContent =
            `Settlement: ${settlementDisplay} (M+2) | QP: ${qpMonth} avg (M+1)`;
    },

    calculateSell() {
        const tonnage = parseFloat(document.getElementById('sellTonnage').value) || 20;
        const premium = this.currentTrade.premium || 0;
        const inventoryIndex = document.getElementById('sellInventory').value;

        const monthData = GAME_STATE.currentMonthData;
        const exchange = this.currentTrade.exchange;

        // Use M+1 quotational pricing for physical sales (not spot)
        const basePrice = exchange === 'COMEX' ? monthData.PRICING.M_PLUS_1.COMEX_AVG : monthData.PRICING.M_PLUS_1.LME_AVG;

        const salePrice = basePrice + premium;
        const totalRevenue = salePrice * tonnage;

        let originalCost = 0;
        if (inventoryIndex !== 'none' && GAME_STATE.physicalPositions[inventoryIndex]) {
            originalCost = GAME_STATE.physicalPositions[inventoryIndex].costPerMT * tonnage;
        } else {
            originalCost = 9000 * tonnage;
        }

        const netProfit = totalRevenue - originalCost;

        document.getElementById('sellBasePrice').textContent = `$${Math.round(basePrice).toLocaleString('en-US')}/MT`;
        document.getElementById('sellRegionalPremium').textContent = `+$${premium}/MT`;
        document.getElementById('sellPricePerMT').textContent = `$${Math.round(salePrice).toLocaleString('en-US')}/MT`;
        document.getElementById('sellTotalRevenue').textContent = `$${Math.round(totalRevenue).toLocaleString('en-US')}`;
        document.getElementById('sellOriginalCost').textContent = `$${Math.round(originalCost).toLocaleString('en-US')}`;

        const profitElement = document.getElementById('sellNetProfit');
        profitElement.textContent = (netProfit > 0 ? '+' : '') + `$${Math.round(netProfit).toLocaleString('en-US')}`;
        profitElement.classList.toggle('negative', netProfit < 0);

        // Calculate M+2 settlement period (settlement happens 2 turns after sale)
        const settlement = TimeManager.calculateSettlement(GAME_STATE.currentMonth, GAME_STATE.currentPeriod);
        const settlementDisplay = TimeManager.formatPeriod(settlement.settlementMonth, settlement.settlementPeriod);

        // M+1 is always next month
        const qpMonth = TimeManager.getMonthName(GAME_STATE.currentMonth + 1);

        document.getElementById('sellQPWarning').textContent =
            `Settlement: ${settlementDisplay} (M+2) | QP: ${qpMonth} avg (M+1)`;
    },

    executeBuy() {
        const tonnage = parseFloat(document.getElementById('buyTonnage').value);
        const exchange = document.querySelector('input[name="exchange"]:checked').value;
        const shippingTerms = document.querySelector('input[name="shippingTerms"]:checked').value;
        const destinationKey = document.getElementById('buyDestination').value;

        const supplier = this.currentTrade.supplier;
        const isLTA = this.currentTrade.isLTA;

        // Check if purchase is allowed
        const purchaseCheck = GAME_STATE.canPurchase(supplier, tonnage);
        if (!purchaseCheck.canBuy) {
            alert(`❌ Purchase Not Allowed\n\n${purchaseCheck.message}`);
            return;
        }

        const monthData = GAME_STATE.currentMonthData;
        const premium = this.currentTrade.premium || 0;

        // Use M+1 quotational pricing for physical purchase (not spot)
        const basePrice = exchange === 'LME' ? monthData.PRICING.M_PLUS_1.LME_AVG : monthData.PRICING.M_PLUS_1.COMEX_AVG;
        const originKey = supplier.toUpperCase();
        const freightData = monthData.LOGISTICS.FREIGHT_RATES[originKey][destinationKey];
        const freight = shippingTerms === 'FOB' ? freightData.FOB_RATE_USD_PER_TONNE : freightData.CIF_RATE_USD_PER_TONNE;

        const costPerMT = basePrice + premium + freight;
        const totalCost = costPerMT * tonnage;

        // Check buying power
        const buyingPower = GAME_STATE.practiceFunds + (GAME_STATE.locLimit - GAME_STATE.locUsed);
        if (totalCost > buyingPower) {
            alert(`❌ Insufficient Buying Power\n\nNeed: $${Math.round(totalCost).toLocaleString('en-US')}\nAvailable: $${Math.round(buyingPower).toLocaleString('en-US')}`);
            return;
        }

        // Execute purchase
        const position = GAME_STATE.purchaseCopper(
            supplier,
            tonnage,
            costPerMT,
            totalCost,
            isLTA,
            exchange,
            shippingTerms,
            destinationKey
        );

        GAME_STATE.updateHeader();

        // Check for exposure warnings
        const exposureData = GAME_STATE.calculatePriceExposure();
        ExposureWarnings.checkAndShowWarning(exposureData, 'unhedgedPosition');

        // Format arrival period properly
        const arrivalPeriod = TimeManager.formatPeriod(position.arrivalMonth, position.arrivalPeriod);

        alert(`✅ Purchase Executed!\n\n${tonnage} MT from ${supplier}\nTotal Cost: $${Math.round(totalCost).toLocaleString('en-US')}\nPaid from Funds: $${Math.round(position.paidFromFunds).toLocaleString('en-US')}\nPaid from LOC: $${Math.round(position.paidFromLOC).toLocaleString('en-US')}\n\nTravel Time: ${position.travelTimeDays} days\nArrival: ${arrivalPeriod} (Turn ${position.arrivalTurn})\n\nRemaining this month: ${purchaseCheck.remaining - tonnage}MT`);
        this.close();

        // Refresh widgets
        MarketsWidget.init();
        PositionsWidget.init();
    },

    executeSell() {
        const tonnage = parseFloat(document.getElementById('sellTonnage').value);
        const inventoryIndex = parseInt(document.getElementById('sellInventory').value);

        if (isNaN(inventoryIndex)) {
            alert('❌ Please select inventory to sell');
            return;
        }

        const position = GAME_STATE.physicalPositions[inventoryIndex];
        if (!position || position.tonnage < tonnage) {
            alert('❌ Insufficient inventory');
            return;
        }

        const region = this.currentTrade.buyer;

        // Check if sale is allowed
        const saleCheck = GAME_STATE.canSell(region, tonnage);
        if (!saleCheck.canSell) {
            alert(`❌ Sale Not Allowed\n\n${saleCheck.message}`);
            return;
        }

        const monthData = GAME_STATE.currentMonthData;
        const exchange = this.currentTrade.exchange;
        const premium = this.currentTrade.premium || 0;

        // Use M+1 quotational pricing for physical sale (not spot)
        const basePrice = exchange === 'COMEX' ? monthData.PRICING.M_PLUS_1.COMEX_AVG : monthData.PRICING.M_PLUS_1.LME_AVG;
        const salePrice = basePrice + premium;
        const totalRevenue = salePrice * tonnage;

        // Execute sale
        const profit = GAME_STATE.sellCopper(inventoryIndex, tonnage, region, salePrice, totalRevenue);

        GAME_STATE.updateHeader();

        alert(`✅ Sale Executed!\n\n${tonnage} MT to ${region}\nRevenue: $${Math.round(totalRevenue).toLocaleString('en-US')}\nProfit: $${Math.round(profit).toLocaleString('en-US')}\n\nRemaining this month: ${saleCheck.remaining - tonnage}MT`);
        this.close();

        // Refresh widgets
        MarketsWidget.init();
        PositionsWidget.init();
    },

    getMonthName(turn) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return months[(turn - 1) % 12];
    },

    getNextMonth(month) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        const index = months.indexOf(month);
        return months[(index + 1) % 12];
    }
};

export { TradePanel };
