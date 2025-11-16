// Futures contract specifications
const FUTURES_CONTRACTS = {
    LME: {
        contractSize: 25,              // 25 Metric Tons per contract
        unit: 'MT',
        description: 'LME Copper Futures (25 MT per contract)'
    },
    COMEX: {
        contractSize: 11.34,           // ≈11.34 MT (25,000 lbs)
        unit: 'MT',
        description: 'COMEX Copper Futures (25,000 lbs ≈ 11.34 MT per contract)'
    }
};

const GAME_STATE = {
    currentTurn: 1,
    currentMonth: 'January',
    currentMonthData: null,
    practiceFunds: 200000,
    locUsed: 0,
    locLimit: 200000,
    locInterestNextMonth: 0,
    physicalPositions: [],
    futuresPositions: [],
    futuresMarginUsed: 0,
    futuresMarginLimit: 100000, // $100K margin pool
    totalFuturesPL: 0,
    totalPL: 0,

    // Track monthly purchases/sales
    monthlyPurchases: {
        CALLAO_LTA: 0,
        CALLAO_SPOT: 0,
        ANTOFAGASTA_SPOT: 0
    },
    monthlySales: {
        AMERICAS: 0,
        ASIA: 0,
        EUROPE: 0
    },

    init() {
        // Access month data from window object (loaded from script tags)
        this.currentMonthData = window.JANUARY_DATA;
        if (!this.currentMonthData) {
            console.error('JANUARY_DATA not loaded! Check data files.');
            return;
        }
        this.updateHeader();
    },

    resetMonthlyLimits() {
        this.monthlyPurchases = {
            CALLAO_LTA: 0,
            CALLAO_SPOT: 0,
            ANTOFAGASTA_SPOT: 0
        };
        this.monthlySales = {
            AMERICAS: 0,
            ASIA: 0,
            EUROPE: 0
        };
    },

    calculateMonthlyInterest() {
        // Interest only on LOC used, at 4.32% annual (0.36% monthly)
        const monthlyRate = 0.0036;
        this.locInterestNextMonth = this.locUsed * monthlyRate;
    },

    purchaseCopper(supplier, tonnage, costPerMT, totalCost, isLTA, exchange, shippingTerms, destination) {
        // Use practice funds first, then LOC
        let amountFromFunds = Math.min(this.practiceFunds, totalCost);
        let amountFromLOC = totalCost - amountFromFunds;

        this.practiceFunds -= amountFromFunds;
        this.locUsed += amountFromLOC;

        // Calculate interest for next month
        this.calculateMonthlyInterest();

        // Create position
        const freightData = this.currentMonthData.LOGISTICS.FREIGHT_RATES[supplier.toUpperCase()][destination];
        const position = {
            id: `POS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'PHYSICAL',
            supplier: supplier,
            originPort: supplier === 'CALLAO' ? 'Callao, Peru' : 'Antofagasta, Chile',
            destinationPort: freightData.PORT_NAME + ', ' + freightData.COUNTRY,
            tonnage: tonnage,
            costPerMT: costPerMT,
            totalCost: totalCost,
            paidFromFunds: amountFromFunds,
            paidFromLOC: amountFromLOC,
            exchange: exchange,
            shippingTerms: shippingTerms,
            purchaseMonth: this.currentMonth,
            purchaseTurn: this.currentTurn,
            isLTA: isLTA,
            travelTimeDays: freightData.TRAVEL_TIME_DAYS,
            distanceNM: freightData.DISTANCE_NM,
            arrivalTurn: this.currentTurn + Math.ceil(freightData.TRAVEL_TIME_DAYS / 30),
            status: 'IN_TRANSIT'
        };

        this.physicalPositions.push(position);
        this.recordPurchase(supplier, tonnage, isLTA);

        return position;
    },

    sellCopper(inventoryIndex, tonnage, region, salePrice, totalRevenue) {
        const position = this.physicalPositions[inventoryIndex];

        // Mark position as sold but don't settle yet
        if (!position.soldInfo) {
            position.soldInfo = {
                region: region,
                tonnage: tonnage,
                salePrice: salePrice,
                totalRevenue: totalRevenue,
                soldTurn: this.currentTurn,
                settlementTurn: position.purchaseTurn + 2 // Settles 2 turns after purchase
            };
            position.status = 'SOLD_PENDING_SETTLEMENT';
        }

        this.recordSale(region, tonnage);

        return 0; // Return 0 profit until settlement
    },

    canPurchase(supplier, tonnage) {
        const data = this.currentMonthData;

        if (supplier === 'CALLAO' && this.currentTrade && this.currentTrade.isLTA) {
            const limit = data.MARKET_DEPTH.SUPPLY.PERUVIAN.LTA_FIXED_MT;
            const remaining = limit - this.monthlyPurchases.CALLAO_LTA;
            return {
                canBuy: remaining >= tonnage,
                remaining: remaining,
                message: remaining < tonnage ? `Only ${remaining}MT remaining for Callao LTA this month` : null
            };
        } else if (supplier === 'CALLAO') {
            const limit = data.MARKET_DEPTH.SUPPLY.PERUVIAN.MAX_OPTIONAL_SPOT_MT;
            const remaining = limit - this.monthlyPurchases.CALLAO_SPOT;
            return {
                canBuy: remaining >= tonnage,
                remaining: remaining,
                message: remaining < tonnage ? `Only ${remaining}MT remaining for Callao Spot this month` : null
            };
        } else if (supplier === 'ANTOFAGASTA') {
            const limit = data.MARKET_DEPTH.SUPPLY.CHILEAN.MAX_AVAILABLE_MT;
            const remaining = limit - this.monthlyPurchases.ANTOFAGASTA_SPOT;
            return {
                canBuy: remaining >= tonnage,
                remaining: remaining,
                message: remaining < tonnage ? `Only ${remaining}MT remaining for Antofagasta this month` : null
            };
        }

        return { canBuy: true, remaining: 999, message: null };
    },

    canSell(region, tonnage) {
        const data = this.currentMonthData;
        const opportunity = data.CLIENTS.OPPORTUNITIES.find(o => o.REGION === region);

        if (!opportunity) return { canSell: false, remaining: 0, message: 'Region not found' };

        const limit = opportunity.MAX_QUANTITY_MT;
        const remaining = limit - (this.monthlySales[region] || 0);

        return {
            canSell: remaining >= tonnage,
            remaining: remaining,
            message: remaining < tonnage ? `Only ${remaining}MT remaining for ${region} this month` : null
        };
    },

    recordPurchase(supplier, tonnage, isLTA) {
        if (supplier === 'CALLAO' && isLTA) {
            this.monthlyPurchases.CALLAO_LTA += tonnage;
        } else if (supplier === 'CALLAO') {
            this.monthlyPurchases.CALLAO_SPOT += tonnage;
        } else if (supplier === 'ANTOFAGASTA') {
            this.monthlyPurchases.ANTOFAGASTA_SPOT += tonnage;
        }
    },

    recordSale(region, tonnage) {
        this.monthlySales[region] = (this.monthlySales[region] || 0) + tonnage;
    },

    updatePositionStatus(turn) {
        this.physicalPositions.forEach(pos => {
            if (pos.status === 'IN_TRANSIT' && turn >= pos.arrivalTurn) {
                pos.status = 'ARRIVED';
            }
        });
    },

    processSettlements(newTurn) {
        const settledPositions = [];

        // Find positions that should settle this turn
        this.physicalPositions = this.physicalPositions.filter(pos => {
            if (pos.soldInfo && newTurn >= pos.soldInfo.settlementTurn) {
                // Settle the position
                const cost = pos.costPerMT * pos.soldInfo.tonnage;
                const profit = pos.soldInfo.totalRevenue - cost;

                // Return LOC first, then add to funds
                const returnToLOC = Math.min(pos.paidFromLOC * (pos.soldInfo.tonnage / pos.tonnage), this.locUsed);
                const returnToFunds = pos.soldInfo.totalRevenue - returnToLOC;

                this.locUsed -= returnToLOC;
                this.practiceFunds += returnToFunds;
                this.totalPL += profit;

                settledPositions.push({
                    ...pos,
                    profit: profit
                });

                this.calculateMonthlyInterest();

                // Remove this position from active positions
                return false;
            }
            return true; // Keep positions that haven't settled
        });

        return settledPositions;
    },

    updateHeader() {
        const data = this.currentMonthData;
        document.getElementById('headerMonth').textContent = `${this.currentMonth.toUpperCase()} (${this.currentTurn}/12)`;
        document.getElementById('headerFunds').textContent = `$${Math.round(this.practiceFunds).toLocaleString('en-US')}`;
        document.getElementById('headerLOC').textContent = `$${Math.round(this.locUsed).toLocaleString('en-US')} / $${this.locLimit.toLocaleString('en-US')}`;
        document.getElementById('headerBuyingPower').textContent = `$${Math.round(this.practiceFunds + (this.locLimit - this.locUsed)).toLocaleString('en-US')}`;
        document.getElementById('headerLOCInterest').textContent = `$${Math.round(this.locInterestNextMonth).toLocaleString('en-US')}`;
        document.getElementById('headerLMESpot').textContent = `$${data.PRICING.LME.SPOT_AVG.toLocaleString('en-US')}`;
        document.getElementById('headerLME3M').textContent = `$${data.PRICING.LME.FUTURES_3M.toLocaleString('en-US')}`;
        document.getElementById('headerCOMEXSpot').textContent = `$${data.PRICING.COMEX.SPOT_AVG.toLocaleString('en-US')}`;
        document.getElementById('headerCOMEX3M').textContent = `$${data.PRICING.COMEX.FUTURES_3M.toLocaleString('en-US')}`;

        const totalPhysicalMT = this.physicalPositions.reduce((sum, pos) => sum + pos.tonnage, 0);
        const totalFuturesMT = this.futuresPositions.reduce((sum, pos) => sum + pos.tonnage, 0);
        document.getElementById('headerPhysicalMT').textContent = totalPhysicalMT.toFixed(1);
        document.getElementById('headerFuturesMT').textContent = totalFuturesMT.toFixed(1);
        document.getElementById('headerPL').textContent = `$${Math.round(this.totalPL).toLocaleString('en-US')}`;
    },

    // ==========================================
    // FUTURES TRADING FUNCTIONS
    // ==========================================

    openFuturesPosition(exchange, contract, direction, tonnage) {
        const monthData = this.currentMonthData;
        const contractSpec = FUTURES_CONTRACTS[exchange];

        // Calculate number of contracts needed
        const numContracts = Math.ceil(tonnage / contractSpec.contractSize);
        const actualTonnage = numContracts * contractSpec.contractSize;

        // Get futures price based on contract
        let futuresPrice;
        const pricing = exchange === 'LME' ? monthData.PRICING.LME : monthData.PRICING.COMEX;

        if (contract === 'M+1') {
            futuresPrice = pricing.FUTURES_1M;
        } else if (contract === 'M+3') {
            futuresPrice = pricing.FUTURES_3M;
        } else if (contract === 'M+12') {
            futuresPrice = pricing.FUTURES_12M;
        }

        const notionalValue = futuresPrice * actualTonnage;
        const marginRequired = notionalValue * 0.10; // 10% margin

        // Check margin availability
        const availableMargin = this.futuresMarginLimit - this.futuresMarginUsed;
        if (marginRequired > availableMargin) {
            return {
                success: false,
                message: `Insufficient margin. Need $${Math.round(marginRequired).toLocaleString('en-US')}, available $${Math.round(availableMargin).toLocaleString('en-US')}`
            };
        }

        // Create position
        const position = {
            id: Date.now(),
            exchange: exchange,
            contract: contract,
            direction: direction,
            tonnage: actualTonnage,
            numContracts: numContracts,
            contractSize: contractSpec.contractSize,
            entryPrice: futuresPrice,
            currentPrice: futuresPrice,
            unrealizedPL: 0,
            margin: marginRequired,
            openTurn: this.currentTurn,
            openMonth: this.currentMonth
        };

        this.futuresPositions.push(position);
        this.futuresMarginUsed += marginRequired;

        this.updateHeader();

        return {
            success: true,
            position: position,
            message: `Opened ${direction} ${numContracts} ${exchange} ${contract} contract(s)\nActual tonnage: ${actualTonnage} MT (${numContracts}× ${contractSpec.contractSize} MT)\nEntry: $${Math.round(futuresPrice).toLocaleString('en-US')}/MT`
        };
    },

    closeFuturesPosition(positionId) {
        const index = this.futuresPositions.findIndex(p => p.id === positionId);
        if (index === -1) {
            return { success: false, message: 'Position not found' };
        }

        const position = this.futuresPositions[index];
        const realizedPL = position.unrealizedPL;

        // Return margin
        this.futuresMarginUsed -= position.margin;

        // Add P&L to practice funds
        this.practiceFunds += realizedPL;
        this.totalPL += realizedPL;
        this.totalFuturesPL += realizedPL;

        // Remove position
        this.futuresPositions.splice(index, 1);

        this.updateHeader();

        return {
            success: true,
            realizedPL: realizedPL,
            message: `Closed position. P&L: ${realizedPL >= 0 ? '+' : ''}$${Math.round(realizedPL).toLocaleString('en-US')}`
        };
    },

    updateFuturesPrices() {
        const monthData = this.currentMonthData;

        this.futuresPositions.forEach(position => {
            // Get current futures price
            let currentPrice;
            const pricing = position.exchange === 'LME' ? monthData.PRICING.LME : monthData.PRICING.COMEX;

            if (position.contract === 'M+1') {
                currentPrice = pricing.FUTURES_1M;
            } else if (position.contract === 'M+3') {
                currentPrice = pricing.FUTURES_3M;
            } else if (position.contract === 'M+12') {
                currentPrice = pricing.FUTURES_12M;
            }

            position.currentPrice = currentPrice;

            // Calculate P&L based on direction
            const priceDiff = currentPrice - position.entryPrice;
            const plMultiplier = position.direction === 'LONG' ? 1 : -1;
            position.unrealizedPL = priceDiff * position.tonnage * plMultiplier;
        });
    }
};

export { GAME_STATE };
