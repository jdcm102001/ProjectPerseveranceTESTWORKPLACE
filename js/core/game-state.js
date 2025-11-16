// Futures contract specifications with complete trading parameters
const FUTURES_SPECS = {
    LME: {
        contractSize: 25,           // MT per contract
        initialMargin: 9000,        // $ per contract
        maintenanceMargin: 9000,    // Same as initial (simplified)
        openFee: 25,                // $ per contract
        closeFee: 25,               // $ per contract
        priceMultiplier: 25,        // For P/L calc (25 MT)
        unit: 'MT',
        description: 'LME Copper (25 MT per contract)'
    },
    COMEX: {
        contractSize: 11.34,        // MT per contract (25,000 lbs)
        initialMargin: 9000,        // $ per contract
        maintenanceMargin: 9000,    // Same as initial
        openFee: 25,                // $ per contract
        closeFee: 25,               // $ per contract
        priceMultiplier: 25000,     // For P/L calc (25,000 lbs)
        unit: 'MT',
        description: 'COMEX Copper (25,000 lbs per contract)'
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
    futuresMarginPosted: 0,     // Total margin posted (IM + accumulated P/L)
    futuresMarginLimit: 100000, // Max $100K in margin
    totalFuturesPL: 0,          // Cumulative realized P/L from closed positions
    totalPL: 0,

    // Contract specifications
    FUTURES_SPECS: FUTURES_SPECS,

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
        document.getElementById('headerPhysicalMT').textContent = totalPhysicalMT.toFixed(1);

        const marginPostedEl = document.getElementById('headerMarginPosted');
        if (marginPostedEl) {
            marginPostedEl.textContent = `$${Math.round(this.futuresMarginPosted).toLocaleString('en-US')} / $100K`;
        }

        document.getElementById('headerPL').textContent = `$${Math.round(this.totalPL).toLocaleString('en-US')}`;
    },

    // ==========================================
    // FUTURES TRADING SYSTEM
    // ==========================================

    openFuturesPosition(exchange, contract, direction, numContracts) {
        const monthData = this.currentMonthData;
        const spec = this.FUTURES_SPECS[exchange];

        // Get futures price
        let futuresPrice;
        const pricing = exchange === 'LME' ? monthData.PRICING.LME : monthData.PRICING.COMEX;

        if (contract === 'M+1') {
            futuresPrice = pricing.FUTURES_1M;
        } else if (contract === 'M+3') {
            futuresPrice = pricing.FUTURES_3M;
        } else if (contract === 'M+12') {
            futuresPrice = pricing.FUTURES_12M;
        }

        // Calculate requirements
        const initialMarginRequired = spec.initialMargin * numContracts;
        const openingFees = spec.openFee * numContracts;
        const totalTonnage = spec.contractSize * numContracts;

        // Check margin limit
        if (this.futuresMarginPosted + initialMarginRequired > this.futuresMarginLimit) {
            return {
                success: false,
                message: `Margin limit exceeded.\nMax: $${this.futuresMarginLimit.toLocaleString('en-US')}\nCurrently used: $${Math.round(this.futuresMarginPosted).toLocaleString('en-US')}`
            };
        }

        // Check for offsetting position
        const offsetResult = this.checkForOffset(exchange, contract, direction, numContracts);
        if (offsetResult.isOffset) {
            return this.executeOffset(offsetResult, futuresPrice, numContracts, spec);
        }

        // Calculate expiry turn
        let expiryTurn = this.currentTurn;
        if (contract === 'M+1') expiryTurn += 1;
        else if (contract === 'M+3') expiryTurn += 3;
        else if (contract === 'M+12') expiryTurn += 12;

        // Create position
        const position = {
            id: Date.now(),
            exchange: exchange,
            contract: contract,
            direction: direction,
            numContracts: numContracts,
            tonnage: totalTonnage,
            contractSize: spec.contractSize,
            entryPrice: futuresPrice,
            currentPrice: futuresPrice,
            initialMargin: initialMarginRequired,
            marginBalance: initialMarginRequired,
            unrealizedPL: 0,
            openTurn: this.currentTurn,
            openMonth: this.currentMonth,
            expiryTurn: expiryTurn
        };

        // Deduct opening fees from practice funds
        this.practiceFunds -= openingFees;

        // Add to margin posted
        this.futuresMarginPosted += initialMarginRequired;

        // Add position
        this.futuresPositions.push(position);

        this.updateHeader();

        return {
            success: true,
            position: position,
            message: `✅ Position Opened\n\n` +
                     `${direction} ${numContracts} ${exchange} ${contract} contract(s)\n` +
                     `Tonnage: ${totalTonnage.toFixed(2)} MT\n` +
                     `Entry: $${Math.round(futuresPrice).toLocaleString('en-US')}/MT\n` +
                     `Margin posted: $${initialMarginRequired.toLocaleString('en-US')}\n` +
                     `Opening fees: $${openingFees.toLocaleString('en-US')}\n` +
                     `Expires: Turn ${expiryTurn}`
        };
    },

    checkForOffset(exchange, contract, direction, numContracts) {
        const oppositeDirection = direction === 'LONG' ? 'SHORT' : 'LONG';
        const matchingPositions = this.futuresPositions.filter(p =>
            p.exchange === exchange &&
            p.contract === contract &&
            p.direction === oppositeDirection
        );

        if (matchingPositions.length === 0) {
            return { isOffset: false };
        }

        const totalOppositeContracts = matchingPositions.reduce((sum, p) => sum + p.numContracts, 0);

        return {
            isOffset: true,
            matchingPositions: matchingPositions,
            totalOppositeContracts: totalOppositeContracts,
            numContracts: numContracts
        };
    },

    executeOffset(offsetResult, closingPrice, numContracts, spec) {
        let contractsToOffset = numContracts;
        let totalPL = 0;
        let totalMarginReturned = 0;
        let totalClosingFees = 0;
        let contractsClosed = 0;

        // Close positions FIFO
        for (let i = 0; i < offsetResult.matchingPositions.length && contractsToOffset > 0; i++) {
            const position = offsetResult.matchingPositions[i];
            const contractsClosing = Math.min(contractsToOffset, position.numContracts);

            // Calculate P/L
            const priceDiff = closingPrice - position.entryPrice;
            const plMultiplier = position.direction === 'LONG' ? 1 : -1;
            const positionPL = priceDiff * spec.priceMultiplier * contractsClosing * plMultiplier;

            totalPL += positionPL;
            contractsClosed += contractsClosing;

            // Calculate margin to return (proportional)
            const marginPerContract = position.initialMargin / position.numContracts;
            const marginReturning = marginPerContract * contractsClosing;
            totalMarginReturned += marginReturning;

            // Calculate closing fees
            const closingFees = spec.closeFee * contractsClosing;
            totalClosingFees += closingFees;

            // Update or remove position
            if (contractsClosing === position.numContracts) {
                const index = this.futuresPositions.indexOf(position);
                this.futuresPositions.splice(index, 1);
            } else {
                position.numContracts -= contractsClosing;
                position.tonnage = position.numContracts * position.contractSize;
                position.initialMargin -= marginReturning;
                position.marginBalance -= marginReturning;
            }

            contractsToOffset -= contractsClosing;
        }

        // Settle finances
        this.practiceFunds += totalPL;
        this.practiceFunds -= totalClosingFees;
        this.totalPL += totalPL;
        this.totalFuturesPL += totalPL;
        this.futuresMarginPosted -= totalMarginReturned;

        this.updateHeader();

        return {
            success: true,
            isOffset: true,
            message: `✅ Position Closed via Offset\n\n` +
                     `Contracts closed: ${contractsClosed}\n` +
                     `P&L: ${totalPL >= 0 ? '+' : ''}$${Math.round(totalPL).toLocaleString('en-US')}\n` +
                     `Margin returned: $${Math.round(totalMarginReturned).toLocaleString('en-US')}\n` +
                     `Closing fees: $${totalClosingFees.toLocaleString('en-US')}\n\n` +
                     `Net change to Practice Funds: ${(totalPL - totalClosingFees) >= 0 ? '+' : ''}$${Math.round(totalPL - totalClosingFees).toLocaleString('en-US')}`
        };
    },

    updateFuturesPrices() {
        const monthData = this.currentMonthData;
        let marginCallsTriggered = [];

        this.futuresPositions.forEach(position => {
            // Get current price
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

            // Calculate P/L (mark-to-market)
            const spec = this.FUTURES_SPECS[position.exchange];
            const priceDiff = currentPrice - position.entryPrice;
            const plMultiplier = position.direction === 'LONG' ? 1 : -1;
            position.unrealizedPL = priceDiff * spec.priceMultiplier * position.numContracts * plMultiplier;

            // Update margin balance
            position.marginBalance = position.initialMargin + position.unrealizedPL;

            // Check for margin call
            if (position.marginBalance < position.initialMargin) {
                const topUp = position.initialMargin - position.marginBalance;

                if (this.practiceFunds >= topUp) {
                    // Can top up
                    this.practiceFunds -= topUp;
                    position.marginBalance = position.initialMargin;
                    position.initialMargin += topUp;
                    this.futuresMarginPosted += topUp;

                    marginCallsTriggered.push({
                        position: position,
                        topUp: topUp,
                        forceClosed: false
                    });
                } else {
                    // Force liquidation
                    this.forceLiquidatePosition(position);
                    marginCallsTriggered.push({
                        position: position,
                        topUp: topUp,
                        forceClosed: true
                    });
                }
            }
        });

        // Show margin call alerts
        if (marginCallsTriggered.length > 0) {
            let message = '⚠️ MARGIN CALL ALERT\n\n';
            marginCallsTriggered.forEach(mc => {
                if (mc.forceClosed) {
                    message += `💀 FORCE LIQUIDATED: ${mc.position.exchange} ${mc.position.contract} ${mc.position.direction}\n`;
                    message += `   Insufficient funds for $${Math.round(mc.topUp).toLocaleString('en-US')} top-up\n\n`;
                } else {
                    message += `✅ TOPPED UP: ${mc.position.exchange} ${mc.position.contract} ${mc.position.direction}\n`;
                    message += `   Added: $${Math.round(mc.topUp).toLocaleString('en-US')}\n\n`;
                }
            });
            alert(message);
        }

        // Check for expiries
        this.checkFuturesExpiry();
    },

    forceLiquidatePosition(position) {
        const index = this.futuresPositions.indexOf(position);
        if (index === -1) return;

        const spec = this.FUTURES_SPECS[position.exchange];
        const closingFees = spec.closeFee * position.numContracts;
        const finalPL = position.marginBalance - position.initialMargin;

        // Return remaining margin (could be negative)
        if (position.marginBalance > 0) {
            this.practiceFunds += position.marginBalance;
        }

        // Deduct closing fees
        this.practiceFunds -= closingFees;

        // Update totals
        this.totalPL += finalPL;
        this.totalFuturesPL += finalPL;
        this.futuresMarginPosted -= position.initialMargin;

        // Remove position
        this.futuresPositions.splice(index, 1);

        this.updateHeader();
    },

    checkFuturesExpiry() {
        const expiringPositions = this.futuresPositions.filter(p => p.expiryTurn === this.currentTurn);

        if (expiringPositions.length === 0) return;

        let expiryMessage = '📅 CONTRACT EXPIRY\n\n';

        expiringPositions.forEach(position => {
            const index = this.futuresPositions.indexOf(position);
            if (index === -1) return;

            const spec = this.FUTURES_SPECS[position.exchange];
            const closingFees = spec.closeFee * position.numContracts;
            const finalPL = position.marginBalance - position.initialMargin;

            // Return margin balance
            this.practiceFunds += position.marginBalance;

            // Deduct closing fees
            this.practiceFunds -= closingFees;

            // Update totals
            this.totalPL += finalPL;
            this.totalFuturesPL += finalPL;
            this.futuresMarginPosted -= position.initialMargin;

            // Remove position
            this.futuresPositions.splice(index, 1);

            expiryMessage += `${position.exchange} ${position.contract} ${position.direction}\n`;
            expiryMessage += `Final P&L: ${finalPL >= 0 ? '+' : ''}$${Math.round(finalPL).toLocaleString('en-US')}\n`;
            expiryMessage += `Margin returned: $${Math.round(position.marginBalance).toLocaleString('en-US')}\n`;
            expiryMessage += `Fees: $${closingFees.toLocaleString('en-US')}\n\n`;
        });

        this.updateHeader();
        alert(expiryMessage);
    }
};

export { GAME_STATE };
