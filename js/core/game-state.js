import { TimeManager } from './time-manager.js';
import { TimerManager } from './timer-manager.js';
import { ScenarioManager } from './scenario-manager.js';

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
    // Period-based time tracking (NEW SYSTEM)
    currentMonth: 1,                    // Month number (1-6)
    currentPeriod: 1,                   // Period (1=Early, 2=Late)
    currentMonthName: 'January',        // Display name
    periodName: 'Early',                // "Early" or "Late"
    currentTurn: 1,                     // Global turn counter (1-12) - DERIVED from month+period

    // Month data reference
    currentMonthData: null,

    // Financial state
    practiceFunds: 200000,
    locUsed: 0,
    locLimit: 200000,
    locInterestNextPeriod: 0,  // Interest charged EVERY period (twice per month)
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

    async init() {
        try {
            // Load scenario manifest
            const scenario = await ScenarioManager.loadDefaultScenario();
            ScenarioManager.validateScenario(scenario);

            console.log(`🎮 Initializing game: ${scenario.name}`);
            console.log(`📅 Duration: ${scenario.duration} months (${scenario.duration * 2} turns)`);

            // Initialize financial state from scenario
            const initialState = ScenarioManager.getInitialState(scenario);
            this.practiceFunds = initialState.practiceFunds;
            this.locLimit = initialState.locLimit;
            this.locUsed = initialState.locUsed;

            // Load first month data from scenario
            this.currentMonthData = ScenarioManager.loadMonthData(1);
            if (!this.currentMonthData) {
                console.error('Failed to load initial month data!');
                return;
            }

            // Initialize period-based time tracking
            this.currentMonth = 1;
            this.currentPeriod = 1;
            this.currentMonthName = TimeManager.getMonthName(this.currentMonth);
            this.periodName = TimeManager.getPeriodName(this.currentPeriod);
            this.currentTurn = TimeManager.getTurnNumber(this.currentMonth, this.currentPeriod);

            // Initialize period timer
            TimerManager.init({
                onTick: (remainingSeconds) => {
                    this.updateTimerDisplay(remainingSeconds);
                },
                onExpire: () => {
                    this.handleTimerExpiration();
                },
                autoStart: true
            });

            this.updateHeader();

            console.log('✅ Game initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            alert(`Failed to initialize game: ${error.message}\n\nPlease check the console for details.`);
        }
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

    calculatePeriodInterest() {
        // Interest on LOC used, at 4.32% annual (0.36% monthly, 0.18% per period)
        // Since there are 2 periods per month, we divide monthly rate by 2
        const periodRate = 0.0018;  // 0.36% / 2 = 0.18% per period
        this.locInterestNextPeriod = this.locUsed * periodRate;
    },

    purchaseCopper(supplier, tonnage, costPerMT, totalCost, isLTA, exchange, shippingTerms, destination) {
        // Use practice funds first, then LOC
        let amountFromFunds = Math.min(this.practiceFunds, totalCost);
        let amountFromLOC = totalCost - amountFromFunds;

        this.practiceFunds -= amountFromFunds;
        this.locUsed += amountFromLOC;

        // Calculate interest for next period
        this.calculatePeriodInterest();

        // Create position
        const freightData = this.currentMonthData.LOGISTICS.FREIGHT_RATES[supplier.toUpperCase()][destination];

        // Calculate arrival using TimeManager
        const arrival = TimeManager.calculateArrival(
            this.currentMonth,
            this.currentPeriod,
            freightData.TRAVEL_TIME_DAYS
        );

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
            purchasePeriod: this.currentPeriod,
            purchaseTurn: this.currentTurn,  // Keep for backwards compatibility during transition
            isLTA: isLTA,
            travelTimeDays: freightData.TRAVEL_TIME_DAYS,
            distanceNM: freightData.DISTANCE_NM,
            arrivalMonth: arrival.arrivalMonth,
            arrivalPeriod: arrival.arrivalPeriod,
            arrivalTurn: TimeManager.getTurnNumber(arrival.arrivalMonth, arrival.arrivalPeriod),
            status: 'IN_TRANSIT'
        };

        this.physicalPositions.push(position);
        this.recordPurchase(supplier, tonnage, isLTA);

        // Dispatch event for maritime map widget
        window.dispatchEvent(new CustomEvent('position-created', {
            detail: { position }
        }));

        return position;
    },

    sellCopper(inventoryIndex, tonnage, region, salePrice, totalRevenue) {
        const position = this.physicalPositions[inventoryIndex];

        // Calculate settlement timing using TimeManager (M+2 system)
        const settlement = TimeManager.calculateSettlement(
            position.purchaseMonth,
            position.purchasePeriod
        );

        // Mark position as sold but don't settle yet
        if (!position.soldInfo) {
            position.soldInfo = {
                region: region,
                tonnage: tonnage,
                salePrice: salePrice,
                totalRevenue: totalRevenue,
                soldMonth: this.currentMonth,
                soldPeriod: this.currentPeriod,
                soldTurn: this.currentTurn,
                settlementMonth: settlement.settlementMonth,
                settlementPeriod: settlement.settlementPeriod,
                settlementTurn: TimeManager.getTurnNumber(settlement.settlementMonth, settlement.settlementPeriod)
            };
            position.status = 'SOLD_PENDING_SETTLEMENT';

            // Dispatch event for position status change
            window.dispatchEvent(new CustomEvent('position-status-changed', {
                detail: { position, oldStatus: 'IN_TRANSIT', newStatus: 'SOLD_PENDING_SETTLEMENT' }
            }));
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

    updatePositionStatus() {
        this.physicalPositions.forEach(pos => {
            // Check if cargo has arrived using period-based comparison
            if (pos.status === 'IN_TRANSIT' && this.currentTurn >= pos.arrivalTurn) {
                pos.status = 'ARRIVED';

                // Dispatch event for position status change
                window.dispatchEvent(new CustomEvent('position-status-changed', {
                    detail: { position: pos, oldStatus: 'IN_TRANSIT', newStatus: 'ARRIVED' }
                }));
            }
        });
    },

    processSettlements() {
        const settledPositions = [];

        // Find positions that should settle this period using period-based comparison
        this.physicalPositions = this.physicalPositions.filter(pos => {
            if (pos.soldInfo && this.currentTurn >= pos.soldInfo.settlementTurn) {
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

                this.calculatePeriodInterest();

                // Remove this position from active positions
                return false;
            }
            return true; // Keep positions that haven't settled
        });

        return settledPositions;
    },

    updateHeader() {
        const data = this.currentMonthData;

        // Get scenario info for total turns
        const scenarioInfo = ScenarioManager.getScenarioInfo();
        const maxTurns = scenarioInfo ? scenarioInfo.totalTurns : 12;

        // 1. Month/Period display
        const periodDisplay = TimeManager.formatPeriod(this.currentMonth, this.currentPeriod);
        document.getElementById('headerMonth').textContent = `${periodDisplay} (Turn ${this.currentTurn}/${maxTurns})`;

        // 2. Timer is updated by updateTimerDisplay()

        // 3. Practice Funds
        document.getElementById('headerPracticeFunds').textContent = `$${Math.round(this.practiceFunds).toLocaleString('en-US')}`;

        // 4. Total P&L
        const plColor = this.totalPL >= 0 ? '#10b981' : '#ef4444';
        const plElement = document.getElementById('headerTotalPL');
        plElement.textContent = `${this.totalPL >= 0 ? '+' : ''}$${Math.round(this.totalPL).toLocaleString('en-US')}`;
        plElement.style.color = plColor;

        // 5. Buying Power
        const buyingPower = this.practiceFunds + (this.locLimit - this.locUsed);
        document.getElementById('headerBuyingPower').textContent = `$${Math.round(buyingPower).toLocaleString('en-US')}`;

        // 6. Physical Inventory
        const totalPhysicalMT = this.physicalPositions.reduce((sum, pos) => sum + pos.tonnage, 0);
        document.getElementById('headerPhysicalMT').textContent = `${totalPhysicalMT.toFixed(1)} MT`;

        // Secondary metrics (expandable section)
        document.getElementById('headerLOC').textContent = `$${Math.round(this.locUsed).toLocaleString('en-US')} / $${this.locLimit.toLocaleString('en-US')}`;
        document.getElementById('headerLOCInterest').textContent = `$${Math.round(this.locInterestNextPeriod).toLocaleString('en-US')}`;

        // Calculate yearly interest rate from monthly SOFR
        const monthlySOFR = data.FIXED_RULES.COST_OF_CARRY.SOFR_1M_PERCENT;
        const yearlyRate = (monthlySOFR * 12).toFixed(2);
        document.getElementById('headerInterestRate').textContent = `${yearlyRate}%`;

        // Update widget elevation based on current state
        if (typeof window.updateWidgetElevation === 'function') {
            window.updateWidgetElevation();
        }

        // Check and show workflow hints
        if (typeof window.WorkflowHints !== 'undefined') {
            window.WorkflowHints.checkAndShowHints();
        }
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
        const openingFees = spec.openFee * numContracts;
        const totalTonnage = spec.contractSize * numContracts;

        // Calculate margin with netting BEFORE adding new position
        const oldMarginCalc = this.calculateMarginWithNetting();
        const oldMargin = oldMarginCalc.totalMargin;

        // Calculate expiry using period system
        let expiryTurn = this.currentTurn;
        if (contract === 'M+1') expiryTurn += 1;
        else if (contract === 'M+3') expiryTurn += 3;
        else if (contract === 'M+12') expiryTurn += 12;

        // Cap expiry at Turn 12 (game end)
        expiryTurn = Math.min(expiryTurn, 12);
        const expiry = TimeManager.getMonthPeriod(expiryTurn);

        // Create temporary position to test margin requirement
        const tempPosition = {
            id: Date.now(),
            exchange: exchange,
            contract: contract,
            direction: direction,
            numContracts: numContracts,
            tonnage: totalTonnage,
            contractSize: spec.contractSize,
            entryPrice: futuresPrice,
            currentPrice: futuresPrice,
            unrealizedPL: 0,
            openTurn: this.currentTurn,
            openMonth: this.currentMonth,
            openPeriod: this.currentPeriod,
            expiryMonth: expiry.month,
            expiryPeriod: expiry.period,
            expiryTurn: expiryTurn
        };

        // Add temporary position and calculate new margin
        this.futuresPositions.push(tempPosition);
        const newMarginCalc = this.calculateMarginWithNetting();
        const newMargin = newMarginCalc.totalMargin;

        // Check if new margin would exceed limit
        if (newMargin > this.futuresMarginLimit) {
            // Remove temp position
            this.futuresPositions.pop();
            return {
                success: false,
                message: `Margin limit exceeded.\nMax: $${this.futuresMarginLimit.toLocaleString('en-US')}\nWould need: $${Math.round(newMargin).toLocaleString('en-US')}\nCurrently used: $${Math.round(oldMargin).toLocaleString('en-US')}`
            };
        }

        // Remove temp position (will add the real one below)
        this.futuresPositions.pop();

        // Check if there's an offset occurring
        const oppositeDirection = direction === 'LONG' ? 'SHORT' : 'LONG';
        const hasOpposite = this.futuresPositions.some(p =>
            p.exchange === exchange &&
            p.contract === contract &&
            p.direction === oppositeDirection
        );

        // Create actual position
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
            unrealizedPL: 0,
            openTurn: this.currentTurn,
            openMonth: this.currentMonth,
            openPeriod: this.currentPeriod,
            expiryMonth: expiry.month,
            expiryPeriod: expiry.period,
            expiryTurn: expiryTurn
        };

        // Deduct opening fees from practice funds
        this.practiceFunds -= openingFees;

        // Add position
        this.futuresPositions.push(position);

        // Update margin posted with netting
        this.futuresMarginPosted = newMargin;

        this.updateHeader();

        // Build message
        const marginChange = newMargin - oldMargin;
        const standardMargin = numContracts * 9000;

        let message = `✅ Position Opened\n\n` +
                     `${direction} ${numContracts} ${exchange} ${contract} contract(s)\n` +
                     `Tonnage: ${totalTonnage.toFixed(2)} MT\n` +
                     `Entry: $${Math.round(futuresPrice).toLocaleString('en-US')}/MT\n` +
                     `Opening fees: $${openingFees.toLocaleString('en-US')}\n` +
                     `Expires: Turn ${expiryTurn}\n\n`;

        if (hasOpposite && marginChange < standardMargin) {
            const saved = standardMargin - marginChange;
            message += `💰 MARGIN NETTING BENEFIT\n` +
                      `Margin added: $${Math.round(marginChange).toLocaleString('en-US')}\n` +
                      `Saved: $${Math.round(saved).toLocaleString('en-US')} (offset occurred)\n` +
                      `\nYour opposite ${oppositeDirection} position offsets this trade,\nreducing margin from $${standardMargin.toLocaleString('en-US')} to $${Math.round(marginChange).toLocaleString('en-US')}!`;
        } else {
            message += `Margin added: $${Math.round(marginChange).toLocaleString('en-US')}`;
        }

        return {
            success: true,
            position: position,
            message: message
        };
    },

    /**
     * Calculate total margin with netting logic
     * Opposite positions in same contract reduce margin requirements
     * Unhedged: $9,000 per contract | Offset pairs: $1,000 per contract
     */
    calculateMarginWithNetting(positions = this.futuresPositions) {
        // Group positions by contract type (exchange + period)
        const groups = {};

        positions.forEach(pos => {
            const key = `${pos.exchange}_${pos.contract}`;
            if (!groups[key]) {
                groups[key] = {
                    exchange: pos.exchange,
                    contract: pos.contract,
                    longContracts: 0,
                    shortContracts: 0
                };
            }

            if (pos.direction === 'LONG') {
                groups[key].longContracts += pos.numContracts;
            } else {
                groups[key].shortContracts += pos.numContracts;
            }
        });

        // Calculate margin for each group
        let totalMargin = 0;
        const breakdown = [];
        const UNHEDGED_MARGIN = 9000;  // Per contract
        const OFFSET_MARGIN = 1000;    // Per offset pair

        Object.values(groups).forEach(group => {
            // Calculate offset pairs and net exposure
            const offsetPairs = Math.min(group.longContracts, group.shortContracts);
            const netContracts = Math.abs(group.longContracts - group.shortContracts);
            const netDirection = group.longContracts > group.shortContracts ? 'LONG' :
                                 group.shortContracts > group.longContracts ? 'SHORT' : 'FLAT';

            // Calculate margin: (offset × $1K) + (net × $9K)
            const offsetMargin = offsetPairs * OFFSET_MARGIN;
            const netMargin = netContracts * UNHEDGED_MARGIN;
            const groupMargin = offsetMargin + netMargin;

            totalMargin += groupMargin;

            breakdown.push({
                contract: `${group.exchange} ${group.contract}`,
                longContracts: group.longContracts,
                shortContracts: group.shortContracts,
                offsetPairs: offsetPairs,
                netContracts: netContracts,
                netDirection: netDirection,
                margin: groupMargin
            });
        });

        // Calculate margin saved vs no netting
        const totalContracts = positions.reduce((sum, p) => sum + p.numContracts, 0);
        const marginWithoutNetting = totalContracts * UNHEDGED_MARGIN;
        const marginSaved = marginWithoutNetting - totalMargin;

        return {
            totalMargin: totalMargin,
            breakdown: breakdown,
            marginSaved: marginSaved,
            marginWithoutNetting: marginWithoutNetting
        };
    },

    /**
     * Calculate price exposure for all open physical positions
     * Detects hedges via futures and calculates unhedged risk
     * Returns risk level: LOW, MODERATE, HIGH, EXTREME
     */
    calculatePriceExposure() {
        // If no physical positions, no exposure
        if (this.physicalPositions.length === 0 || !this.physicalPositions.some(p => p.status === 'OPEN')) {
            return {
                totalExposure: 0,
                exposurePercentage: 0,
                riskLevel: 'LOW',
                riskColor: '#10b981',
                riskIcon: '🟢',
                positionBreakdown: [],
                hasHighRisk: false
            };
        }

        const positionBreakdown = [];
        let totalUnhedgedExposure = 0;

        this.physicalPositions.forEach(position => {
            // Only analyze OPEN physical positions
            if (position.status !== 'OPEN') return;

            // Get current market price for this position
            const monthData = this.currentMonthData;
            const pricing = position.exchange === 'LME' ? monthData.PRICING.LME : monthData.PRICING.COMEX;
            const currentPrice = pricing.SPOT_AVG;  // Use spot price as mark-to-market

            // Calculate total position value
            const positionValue = position.tonnage * currentPrice;

            // Check if position is hedged by futures
            const hedgeInfo = this.checkPositionHedge(position);

            // Calculate unhedged exposure
            const unhedgedTonnage = position.tonnage * (1 - hedgeInfo.coveragePercentage);
            const unhedgedExposure = unhedgedTonnage * currentPrice;

            totalUnhedgedExposure += unhedgedExposure;

            positionBreakdown.push({
                positionId: position.id,
                supplier: position.supplier,
                tonnage: position.tonnage,
                exchange: position.exchange,
                currentPrice: currentPrice,
                positionValue: positionValue,
                hedgeStatus: hedgeInfo.status,
                hedgeCoverage: hedgeInfo.coveragePercentage,
                unhedgedExposure: unhedgedExposure
            });
        });

        // Calculate exposure as percentage of practice funds
        const exposurePercentage = this.practiceFunds > 0 ? (totalUnhedgedExposure / this.practiceFunds) * 100 : 0;

        // Determine risk level
        let riskLevel, riskColor, riskIcon;
        if (exposurePercentage === 0) {
            riskLevel = 'LOW';
            riskColor = '#10b981';
            riskIcon = '🟢';
        } else if (exposurePercentage < 30) {
            riskLevel = 'MODERATE';
            riskColor = '#fbbf24';
            riskIcon = '🟡';
        } else if (exposurePercentage < 50) {
            riskLevel = 'HIGH';
            riskColor = '#ef4444';
            riskIcon = '🔴';
        } else {
            riskLevel = 'EXTREME';
            riskColor = '#dc2626';
            riskIcon = '🔴';
        }

        return {
            totalExposure: totalUnhedgedExposure,
            exposurePercentage: exposurePercentage,
            riskLevel: riskLevel,
            riskColor: riskColor,
            riskIcon: riskIcon,
            positionBreakdown: positionBreakdown,
            hasHighRisk: exposurePercentage >= 30
        };
    },

    /**
     * Check if a physical position is hedged by futures positions
     * Returns hedge status and coverage percentage
     */
    checkPositionHedge(physicalPosition) {
        // Physical positions are "LONG" (we own copper), so we need SHORT futures to hedge
        const requiredDirection = 'SHORT';
        const requiredExchange = physicalPosition.exchange;

        // Find matching futures positions
        const matchingFutures = this.futuresPositions.filter(fp =>
            fp.exchange === requiredExchange &&
            fp.direction === requiredDirection
        );

        if (matchingFutures.length === 0) {
            return {
                status: 'NONE',
                coveragePercentage: 0,
                description: '🔴 UNHEDGED'
            };
        }

        // Calculate total hedged tonnage
        const totalHedgedTonnage = matchingFutures.reduce((sum, fp) => sum + fp.tonnage, 0);

        // Calculate coverage percentage (allow tolerance)
        const coveragePercentage = Math.min(totalHedgedTonnage / physicalPosition.tonnage, 1);

        // Determine hedge status
        let status, description;
        if (coveragePercentage >= 0.8) {  // 80%+ coverage
            status = 'FULL';
            description = '🟢 FULLY HEDGED';
        } else if (coveragePercentage >= 0.3) {  // 30-80% coverage
            status = 'PARTIAL';
            description = `🟡 PARTIAL (${Math.round(coveragePercentage * 100)}%)`;
        } else {  // <30% coverage
            status = 'NONE';
            description = '🔴 UNHEDGED';
        }

        return {
            status: status,
            coveragePercentage: coveragePercentage,
            description: description,
            matchingFutures: matchingFutures.length
        };
    },

    closeFuturesPosition(positionId) {
        const position = this.futuresPositions.find(p => p.id === positionId);
        if (!position) {
            return { success: false, message: 'Position not found' };
        }

        const spec = this.FUTURES_SPECS[position.exchange];

        // Calculate closing fees
        const closingFees = spec.closeFee * position.numContracts;

        // Calculate final P&L
        const finalPL = position.unrealizedPL;

        // Remove position
        const index = this.futuresPositions.indexOf(position);
        this.futuresPositions.splice(index, 1);

        // Recalculate margin with netting
        const marginCalc = this.calculateMarginWithNetting();
        const oldMargin = this.futuresMarginPosted;
        this.futuresMarginPosted = marginCalc.totalMargin;
        const marginReturned = oldMargin - this.futuresMarginPosted;

        // Settle finances
        this.practiceFunds += finalPL;  // Add/subtract P&L
        this.practiceFunds -= closingFees;  // Deduct fees
        this.practiceFunds += marginReturned;  // Return margin
        this.totalPL += finalPL;
        this.totalFuturesPL += finalPL;

        this.updateHeader();

        return {
            success: true,
            message: `✅ Position Closed\n\n` +
                     `${position.direction} ${position.numContracts} ${position.exchange} ${position.contract}\n` +
                     `P&L: ${finalPL >= 0 ? '+' : ''}$${Math.round(finalPL).toLocaleString('en-US')}\n` +
                     `Margin returned: $${Math.round(marginReturned).toLocaleString('en-US')}\n` +
                     `Closing fees: $${closingFees.toLocaleString('en-US')}\n\n` +
                     `Net change: ${(finalPL - closingFees) >= 0 ? '+' : ''}$${Math.round(finalPL - closingFees).toLocaleString('en-US')}`
        };
    },

    updateFuturesPrices() {
        const monthData = this.currentMonthData;

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
        });

        // Recalculate total margin with netting after price updates
        const marginCalc = this.calculateMarginWithNetting();
        this.futuresMarginPosted = marginCalc.totalMargin;

        this.updateHeader();

        // Check for expiries
        this.checkFuturesExpiry();
    },

    forceLiquidatePosition(position) {
        const index = this.futuresPositions.indexOf(position);
        if (index === -1) return;

        const spec = this.FUTURES_SPECS[position.exchange];
        const closingFees = spec.closeFee * position.numContracts;

        // Remove position first
        this.futuresPositions.splice(index, 1);

        // Recalculate margin with netting
        const marginCalc = this.calculateMarginWithNetting();
        this.futuresMarginPosted = marginCalc.totalMargin;

        // Settle P&L
        this.practiceFunds += position.unrealizedPL;
        this.practiceFunds -= closingFees;
        this.totalPL += position.unrealizedPL;
        this.totalFuturesPL += position.unrealizedPL;

        this.updateHeader();
    },

    checkFuturesExpiry() {
        // Check for positions expiring in this period
        const expiringPositions = this.futuresPositions.filter(p => p.expiryTurn === this.currentTurn);

        if (expiringPositions.length === 0) return;

        let expiryMessage = `📅 CONTRACT EXPIRY - ${TimeManager.formatPeriod(this.currentMonth, this.currentPeriod)}\n\n`;
        let totalPL = 0;
        let totalFees = 0;

        expiringPositions.forEach(position => {
            const index = this.futuresPositions.indexOf(position);
            if (index === -1) return;

            const spec = this.FUTURES_SPECS[position.exchange];
            const closingFees = spec.closeFee * position.numContracts;

            // Settle P&L
            this.practiceFunds += position.unrealizedPL;
            this.practiceFunds -= closingFees;

            // Update totals
            this.totalPL += position.unrealizedPL;
            this.totalFuturesPL += position.unrealizedPL;
            totalPL += position.unrealizedPL;
            totalFees += closingFees;

            // Remove position
            this.futuresPositions.splice(index, 1);

            expiryMessage += `${position.exchange} ${position.contract} ${position.direction}\n`;
            expiryMessage += `Final P&L: ${position.unrealizedPL >= 0 ? '+' : ''}$${Math.round(position.unrealizedPL).toLocaleString('en-US')}\n`;
            expiryMessage += `Fees: $${closingFees.toLocaleString('en-US')}\n\n`;
        });

        // Recalculate margin after removing expired positions
        const marginCalc = this.calculateMarginWithNetting();
        this.futuresMarginPosted = marginCalc.totalMargin;

        expiryMessage += `Total P&L: ${totalPL >= 0 ? '+' : ''}$${Math.round(totalPL).toLocaleString('en-US')}\n`;
        expiryMessage += `Total Fees: $${Math.round(totalFees).toLocaleString('en-US')}\n`;
        expiryMessage += `Net Impact: ${(totalPL - totalFees) >= 0 ? '+' : ''}$${Math.round(totalPL - totalFees).toLocaleString('en-US')}`;

        this.updateHeader();
        alert(expiryMessage);
    },

    // ==========================================
    // PERIOD ADVANCEMENT SYSTEM
    // ==========================================

    /**
     * Advance to the next period
     * Handles:
     * - Period/month progression
     * - Month data loading
     * - Position status updates
     * - Settlement processing
     * - Monthly limit resets
     * - Futures price updates
     * - Game end detection
     */
    advancePeriod() {
        // Store old period for boundary detection
        const oldMonth = this.currentMonth;
        const oldPeriod = this.currentPeriod;

        // Get scenario info to check duration
        const scenarioInfo = ScenarioManager.getScenarioInfo();
        const maxTurns = scenarioInfo ? scenarioInfo.totalTurns : 12;

        // Check for game end BEFORE advancing
        if (this.currentTurn >= maxTurns) {
            this.handleGameEnd();
            return;
        }

        // Advance to next period
        const nextPeriod = TimeManager.advancePeriod(this.currentMonth, this.currentPeriod);

        // Update time tracking
        this.currentMonth = nextPeriod.month;
        this.currentPeriod = nextPeriod.period;
        this.currentMonthName = TimeManager.getMonthName(this.currentMonth);
        this.periodName = TimeManager.getPeriodName(this.currentPeriod);
        this.currentTurn = TimeManager.getTurnNumber(this.currentMonth, this.currentPeriod);

        // Detect month boundary crossing
        const crossedMonthBoundary = TimeManager.isMonthBoundary(oldMonth, oldPeriod, this.currentMonth, this.currentPeriod);

        // Load new month data if we crossed a month boundary
        if (crossedMonthBoundary) {
            this.loadMonthData(this.currentMonth);
            this.resetMonthlyLimits();
        }

        // Deduct LOC interest EVERY period (not just at month boundaries)
        if (this.locInterestNextPeriod > 0) {
            this.practiceFunds -= this.locInterestNextPeriod;
            console.log(`💰 LOC Interest deducted: $${this.locInterestNextPeriod.toFixed(2)} (Period ${this.currentTurn})`);
        }

        // Process period events
        this.updatePositionStatus();      // Check for arrivals
        this.processSettlements();        // Check for settlements
        this.updateFuturesPrices();       // Update futures MTM and check expiries

        // Update UI
        this.updateHeader();

        // Reset and restart timer for new period
        TimerManager.reset();
        TimerManager.start();

        // Dispatch period change event for widgets
        window.dispatchEvent(new CustomEvent('period-advanced', {
            detail: {
                oldMonth,
                oldPeriod,
                newMonth: this.currentMonth,
                newPeriod: this.currentPeriod,
                currentTurn: this.currentTurn,
                crossedMonthBoundary
            }
        }));

        console.log(`⏭️ Advanced to ${TimeManager.formatPeriod(this.currentMonth, this.currentPeriod)} (Turn ${this.currentTurn}/12)`);
    },

    /**
     * Load month data based on month number using scenario manager
     * @param {number} monthNumber - Month (1-N)
     */
    loadMonthData(monthNumber) {
        try {
            this.currentMonthData = ScenarioManager.loadMonthData(monthNumber);
        } catch (error) {
            console.error(`Failed to load month ${monthNumber} data:`, error);
            // Fallback to hardcoded map for backwards compatibility
            const monthDataMap = {
                1: 'JANUARY_DATA',
                2: 'FEBRUARY_DATA',
                3: 'MARCH_DATA',
                4: 'APRIL_DATA',
                5: 'MAY_DATA',
                6: 'JUNE_DATA'
            };

            const dataKey = monthDataMap[monthNumber];
            if (!dataKey || !window[dataKey]) {
                console.error(`Month data not found for month ${monthNumber} (${dataKey})`);
                return;
            }

            this.currentMonthData = window[dataKey];
            console.log(`📊 Loaded ${TimeManager.getMonthName(monthNumber)} data (fallback)`);
        }
    },

    /**
     * Handle game end (after Turn 12 or scenario duration)
     */
    handleGameEnd() {
        const finalScore = this.totalPL;
        const scenarioInfo = ScenarioManager.getScenarioInfo();
        const startingCapital = scenarioInfo?.startingCapital || 200000;

        // Use scenario-based grading
        const gradeInfo = ScenarioManager.calculateGrade(finalScore, startingCapital);

        let message = `🎮 GAME COMPLETE!\n\n`;
        message += `Scenario: ${scenarioInfo?.name || 'Unknown'}\n`;
        message += `Final Profit/Loss: ${finalScore >= 0 ? '+' : ''}$${Math.round(finalScore).toLocaleString('en-US')}\n`;
        message += `Return on Investment: ${gradeInfo.roi}%\n\n`;
        message += `Grade: ${gradeInfo.gradeEmoji} ${gradeInfo.grade}\n`;
        message += `${gradeInfo.description}\n\n`;
        message += `Thank you for playing Project Perseverance!`;

        alert(message);

        // Dispatch game end event
        window.dispatchEvent(new CustomEvent('game-ended', {
            detail: {
                finalPL: finalScore,
                roi: parseFloat(gradeInfo.roi),
                grade: gradeInfo.grade,
                scenario: scenarioInfo
            }
        }));

        // Stop timer on game end
        TimerManager.stop();
    },

    // ==========================================
    // TIMER SYSTEM
    // ==========================================

    /**
     * Update timer display in header
     * @param {number} remainingSeconds - Remaining seconds in period
     */
    updateTimerDisplay(remainingSeconds) {
        const timerElement = document.getElementById('periodTimer');
        if (!timerElement) return;

        const formattedTime = TimerManager.formatTime(remainingSeconds);
        timerElement.textContent = formattedTime;

        // Add visual warnings
        if (remainingSeconds <= 30) {
            timerElement.className = 'timer-critical';
        } else if (remainingSeconds <= 60) {
            timerElement.className = 'timer-warning';
        } else {
            timerElement.className = '';
        }

        // Update progress bar if exists
        const progressBar = document.getElementById('timerProgress');
        if (progressBar) {
            const percentage = ((TimerManager.PERIOD_DURATION_SECONDS - remainingSeconds) / TimerManager.PERIOD_DURATION_SECONDS) * 100;
            progressBar.style.width = `${percentage}%`;
        }
    },

    /**
     * Handle timer expiration (auto-advance)
     */
    handleTimerExpiration() {
        console.log('⏰ Timer expired - Auto-advancing period...');

        // Show notification
        const confirmAdvance = confirm(
            `⏰ PERIOD TIME EXPIRED!\n\n` +
            `Current: ${TimeManager.formatPeriod(this.currentMonth, this.currentPeriod)}\n\n` +
            `The period timer has run out.\n` +
            `Click OK to advance to the next period.`
        );

        if (confirmAdvance) {
            this.advancePeriod();

            // Reset and restart timer for new period
            TimerManager.reset();
            TimerManager.start();

            // Refresh widgets
            if (typeof window.MarketsWidget !== 'undefined') {
                window.MarketsWidget.init();
            }
            if (typeof window.PositionsWidget !== 'undefined') {
                window.PositionsWidget.render();
            }
            if (typeof window.FuturesWidget !== 'undefined') {
                window.FuturesWidget.render();
                window.FuturesWidget.renderGraph();
            }
        } else {
            // User declined auto-advance, pause timer
            TimerManager.pause();
            console.log('⏸️ User declined auto-advance, timer paused');
        }
    },

    /**
     * Toggle timer pause/resume
     */
    toggleTimer() {
        if (TimerManager.isRunning) {
            TimerManager.pause();
            console.log('⏸️ Timer paused by user');
        } else if (TimerManager.isPaused) {
            TimerManager.resume();
            console.log('▶️ Timer resumed by user');
        }

        // Update button text
        const timerButton = document.getElementById('timerToggleBtn');
        if (timerButton) {
            timerButton.textContent = TimerManager.isRunning ? '⏸️ Pause' : '▶️ Resume';
        }
    }
};

export { GAME_STATE };
