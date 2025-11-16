import { GAME_STATE } from './game-state.js';
import { PositionsWidget } from '../widgets/positions-widget.js';
import { MarketsWidget } from '../widgets/markets-widget.js';

const TradePanel = {
    currentTrade: {},
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,

    init() {
        console.log('TradePanel.init() called');
        const buyHeader = document.getElementById('buyPanelHeader');
        const sellHeader = document.getElementById('sellPanelHeader');

        // Drag handlers
        buyHeader.addEventListener('mousedown', (e) => this.startDrag(e, 'buyPanel'));
        sellHeader.addEventListener('mousedown', (e) => this.startDrag(e, 'sellPanel'));

        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDrag());

        // Buy panel event listeners
        const buyTonnage = document.getElementById('buyTonnage');
        const executeBuyBtn = document.getElementById('executeBuyBtn');
        const buyPanelClose = document.getElementById('buyPanelClose');

        console.log('executeBuyBtn element:', executeBuyBtn);
        console.log('buyPanelClose element:', buyPanelClose);

        buyTonnage?.addEventListener('input', () => this.calculateBuy());
        document.getElementById('buyDestination')?.addEventListener('change', () => this.calculateBuy());
        document.getElementById('buyLMEOption')?.addEventListener('click', (e) => this.selectExchange('LME', e));
        document.getElementById('buyCOMEXOption')?.addEventListener('click', (e) => this.selectExchange('COMEX', e));
        document.getElementById('fobOption')?.addEventListener('click', () => this.selectShipping('FOB'));
        document.getElementById('cifOption')?.addEventListener('click', () => this.selectShipping('CIF'));
        executeBuyBtn?.addEventListener('click', () => {
            console.log('EXECUTE BUY CLICKED!');
            this.executeBuy();
        });
        buyPanelClose?.addEventListener('click', () => {
            console.log('CLOSE CLICKED!');
            this.close();
        });

        // Sell panel event listeners
        document.getElementById('sellInventory')?.addEventListener('change', () => this.calculateSell());
        document.getElementById('sellTonnage')?.addEventListener('input', () => this.calculateSell());
        document.getElementById('executeSellBtn')?.addEventListener('click', () => {
            console.log('EXECUTE SELL CLICKED!');
            this.executeSell();
        });
        document.getElementById('sellPanelClose')?.addEventListener('click', () => {
            console.log('SELL CLOSE CLICKED!');
            this.close();
        });

        console.log('TradePanel.init() completed');
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
        document.getElementById('buyBasis').textContent = basis.replace('_', ' / ') + ' M+1';
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
        console.log('TradePanel.close() called');
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

        if (GAME_STATE.physicalPositions.length === 0) {
            select.innerHTML = '<option value="none">-- No inventory available --</option>';
            return;
        }

        const options = GAME_STATE.physicalPositions.map((pos, index) => {
            return `<option value="${index}">${pos.tonnage}MT from ${pos.supplier} @ $${pos.costPerMT}/MT</option>`;
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

        const spotPrice = exchange === 'LME' ? monthData.PRICING.LME.SPOT_AVG : monthData.PRICING.COMEX.SPOT_AVG;

        const originKey = supplier.toUpperCase();
        const freightData = monthData.LOGISTICS.FREIGHT_RATES[originKey][destinationKey];
        const fobFreight = freightData.FOB_RATE_USD_PER_TONNE;
        const cifFreight = freightData.CIF_RATE_USD_PER_TONNE;

        const fobPrice = spotPrice + premium + fobFreight;
        const cifPrice = spotPrice + premium + cifFreight;
        const selectedPrice = shippingTerms === 'FOB' ? fobPrice : cifPrice;
        const totalCost = selectedPrice * tonnage;

        document.getElementById('fobPriceDisplay').textContent = `$${Math.round(fobPrice).toLocaleString('en-US')}/MT`;
        document.getElementById('cifPriceDisplay').textContent = `$${Math.round(cifPrice).toLocaleString('en-US')}/MT`;

        document.getElementById('buyBasePrice').textContent = `$${Math.round(spotPrice).toLocaleString('en-US')}/MT`;
        document.getElementById('buySupplierPremium').textContent = premium > 0 ? `+$${premium}/MT` : '$0/MT';
        document.getElementById('buyFreight').textContent = `$${Math.round(shippingTerms === 'FOB' ? fobFreight : cifFreight)}/MT (${shippingTerms})`;
        document.getElementById('buyPricePerMT').textContent = `$${Math.round(selectedPrice).toLocaleString('en-US')}/MT`;
        document.getElementById('buyTotalCost').textContent = `$${Math.round(totalCost).toLocaleString('en-US')}`;

        const currentMonth = GAME_STATE.currentMonth;
        const nextMonth = this.getNextMonth(currentMonth);
        const settlementMonth = this.getNextMonth(nextMonth);
        document.getElementById('buyQPWarning').textContent =
            `QP settlement in ${settlementMonth} based on ${nextMonth} average`;
    },

    calculateSell() {
        const tonnage = parseFloat(document.getElementById('sellTonnage').value) || 20;
        const premium = this.currentTrade.premium || 0;
        const inventoryIndex = document.getElementById('sellInventory').value;

        const monthData = GAME_STATE.currentMonthData;
        const exchange = this.currentTrade.exchange;

        const spotPrice = exchange === 'COMEX' ? monthData.PRICING.COMEX.SPOT_AVG : monthData.PRICING.LME.SPOT_AVG;

        const salePrice = spotPrice + premium;
        const totalRevenue = salePrice * tonnage;

        let originalCost = 0;
        if (inventoryIndex !== 'none' && GAME_STATE.physicalPositions[inventoryIndex]) {
            originalCost = GAME_STATE.physicalPositions[inventoryIndex].costPerMT * tonnage;
        } else {
            originalCost = 9000 * tonnage;
        }

        const netProfit = totalRevenue - originalCost;

        document.getElementById('sellBasePrice').textContent = `$${Math.round(spotPrice).toLocaleString('en-US')}/MT`;
        document.getElementById('sellRegionalPremium').textContent = `+$${premium}/MT`;
        document.getElementById('sellPricePerMT').textContent = `$${Math.round(salePrice).toLocaleString('en-US')}/MT`;
        document.getElementById('sellTotalRevenue').textContent = `$${Math.round(totalRevenue).toLocaleString('en-US')}`;
        document.getElementById('sellOriginalCost').textContent = `$${Math.round(originalCost).toLocaleString('en-US')}`;

        const profitElement = document.getElementById('sellNetProfit');
        profitElement.textContent = (netProfit > 0 ? '+' : '') + `$${Math.round(netProfit).toLocaleString('en-US')}`;
        profitElement.classList.toggle('negative', netProfit < 0);

        const currentMonth = GAME_STATE.currentMonth;
        const nextMonth = this.getNextMonth(currentMonth);
        const settlementMonth = this.getNextMonth(nextMonth);
        document.getElementById('sellQPWarning').textContent =
            `QP settlement in ${settlementMonth} based on ${nextMonth} average`;
    },

    executeBuy() {
        console.log('TradePanel.executeBuy() called');
        const tonnage = parseFloat(document.getElementById('buyTonnage').value);
        const exchange = document.querySelector('input[name="exchange"]:checked').value;
        const shippingTerms = document.querySelector('input[name="shippingTerms"]:checked').value;
        const destinationKey = document.getElementById('buyDestination').value;
        console.log('Buy params:', { tonnage, exchange, shippingTerms, destinationKey });

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

        const spotPrice = exchange === 'LME' ? monthData.PRICING.LME.SPOT_AVG : monthData.PRICING.COMEX.SPOT_AVG;
        const originKey = supplier.toUpperCase();
        const freightData = monthData.LOGISTICS.FREIGHT_RATES[originKey][destinationKey];
        const freight = shippingTerms === 'FOB' ? freightData.FOB_RATE_USD_PER_TONNE : freightData.CIF_RATE_USD_PER_TONNE;

        const costPerMT = spotPrice + premium + freight;
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

        const arrivalMonth = this.getMonthName(position.arrivalTurn);
        alert(`✅ Purchase Executed!\n\n${tonnage} MT from ${supplier}\nTotal Cost: $${Math.round(totalCost).toLocaleString('en-US')}\nPaid from Funds: $${Math.round(position.paidFromFunds).toLocaleString('en-US')}\nPaid from LOC: $${Math.round(position.paidFromLOC).toLocaleString('en-US')}\n\nTravel Time: ${position.travelTimeDays} days\nArrival: ${arrivalMonth}\n\nRemaining this month: ${purchaseCheck.remaining - tonnage}MT`);
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

        const spotPrice = exchange === 'COMEX' ? monthData.PRICING.COMEX.SPOT_AVG : monthData.PRICING.LME.SPOT_AVG;
        const salePrice = spotPrice + premium;
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
