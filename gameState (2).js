/**
 * GAME STATE MODULE
 * Central state management for the Trading Simulator
 * Handles all game data, transactions, and state persistence
 */

const GameStateManager = {
    // Core game state
    state: {
        currentTurn: 1,
        currentMonth: 'January',
        practiceFunds: 200000,
        locUsed: 0,
        locLimit: 200000,
        
        // Position tracking
        physicalPositions: [],
        futuresPositions: [],
        
        // P&L tracking
        realizedPL: 0,
        unrealizedPL: 0,
        totalPL: 0,
        
        // Transaction history
        transactions: [],
        
        // Month history
        monthlyResults: []
    },
    
    // Data references
    monthDataMap: {
        1: 'JANUARY_DATA',
        2: 'FEBRUARY_DATA',
        3: 'MARCH_DATA',
        4: 'APRIL_DATA'
    },
    
    /**
     * Initialize game state
     */
    init() {
        this.loadState();
        this.updateCurrentMonthData();
    },
    
    /**
     * Update current month data reference
     */
    updateCurrentMonthData() {
        const dataName = this.monthDataMap[this.state.currentTurn];
        if (window[dataName]) {
            this.currentMonthData = window[dataName];
            this.state.currentMonth = this.currentMonthData.MONTH;
        } else {
            console.error(`Month data not found for turn ${this.state.currentTurn}`);
        }
    },
    
    /**
     * Add physical position
     */
    addPhysicalPosition(position) {
        const id = `PHYS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const newPosition = {
            id: id,
            type: 'PHYSICAL',
            supplier: position.supplier,
            originPort: position.originPort,
            destinationPort: position.destinationPort,
            tonnage: position.tonnage,
            exchange: position.exchange,
            basePrice: position.basePrice,
            supplierPremium: position.supplierPremium,
            freightCost: position.freightCost,
            shippingTerms: position.shippingTerms,
            costPerMT: position.costPerMT,
            totalCost: position.totalCost,
            purchaseMonth: this.state.currentMonth,
            purchaseTurn: this.state.currentTurn,
            status: 'OPEN',
            qpMonth: this.getQPMonth(this.state.currentTurn)
        };
        
        this.state.physicalPositions.push(newPosition);
        this.state.locUsed += newPosition.totalCost;
        
        this.recordTransaction({
            type: 'BUY',
            positionId: id,
            details: newPosition,
            amount: -newPosition.totalCost,
            turn: this.state.currentTurn
        });
        
        this.saveState();
        return newPosition;
    },
    
    /**
     * Close physical position (sell)
     */
    closePhysicalPosition(positionId, saleDetails) {
        const position = this.state.physicalPositions.find(p => p.id === positionId);
        if (!position) {
            throw new Error('Position not found');
        }
        
        const tonnageSold = saleDetails.tonnage;
        
        if (tonnageSold > position.tonnage) {
            throw new Error('Cannot sell more tonnage than available');
        }
        
        // Calculate sale proceeds
        const saleProceeds = {
            basePrice: saleDetails.basePrice,
            regionalPremium: saleDetails.regionalPremium,
            salePrice: saleDetails.salePrice,
            totalRevenue: saleDetails.totalRevenue,
            costBasis: position.costPerMT * tonnageSold,
            grossProfit: saleDetails.totalRevenue - (position.costPerMT * tonnageSold)
        };
        
        // Update or remove position
        if (tonnageSold === position.tonnage) {
            position.status = 'CLOSED';
            position.closeDetails = saleProceeds;
            position.closeTurn = this.state.currentTurn;
        } else {
            position.tonnage -= tonnageSold;
            position.totalCost -= (position.costPerMT * tonnageSold);
        }
        
        // Update funds
        this.state.practiceFunds += saleProceeds.grossProfit;
        this.state.locUsed -= saleProceeds.costBasis;
        this.state.realizedPL += saleProceeds.grossProfit;
        this.state.totalPL = this.state.realizedPL + this.state.unrealizedPL;
        
        this.recordTransaction({
            type: 'SELL',
            positionId: positionId,
            details: {
                ...saleDetails,
                ...saleProceeds
            },
            amount: saleProceeds.totalRevenue,
            turn: this.state.currentTurn
        });
        
        this.saveState();
        return saleProceeds;
    },
    
    /**
     * Add futures position
     */
    addFuturesPosition(position) {
        const id = `FUT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const newPosition = {
            id: id,
            type: 'FUTURES',
            exchange: 'LME', // Always LME per rules
            direction: position.direction, // 'LONG' or 'SHORT'
            tonnage: position.tonnage,
            entryPrice: position.entryPrice,
            contract: position.contract,
            openMonth: this.state.currentMonth,
            openTurn: this.state.currentTurn,
            status: 'OPEN',
            marginRequired: position.marginRequired
        };
        
        this.state.futuresPositions.push(newPosition);
        
        this.recordTransaction({
            type: 'FUTURES_OPEN',
            positionId: id,
            details: newPosition,
            amount: 0, // Futures don't affect cash immediately
            turn: this.state.currentTurn
        });
        
        this.saveState();
        return newPosition;
    },
    
    /**
     * Close futures position
     */
    closeFuturesPosition(positionId, exitPrice) {
        const position = this.state.futuresPositions.find(p => p.id === positionId);
        if (!position) {
            throw new Error('Futures position not found');
        }
        
        const priceDiff = position.direction === 'LONG' 
            ? (exitPrice - position.entryPrice)
            : (position.entryPrice - exitPrice);
            
        const pl = priceDiff * position.tonnage;
        
        position.status = 'CLOSED';
        position.exitPrice = exitPrice;
        position.closeMonth = this.state.currentMonth;
        position.closeTurn = this.state.currentTurn;
        position.pl = pl;
        
        this.state.practiceFunds += pl;
        this.state.realizedPL += pl;
        this.state.totalPL = this.state.realizedPL + this.state.unrealizedPL;
        
        this.recordTransaction({
            type: 'FUTURES_CLOSE',
            positionId: positionId,
            details: {
                exitPrice: exitPrice,
                pl: pl
            },
            amount: pl,
            turn: this.state.currentTurn
        });
        
        this.saveState();
        return pl;
    },
    
    /**
     * Calculate unrealized P&L for all open positions
     */
    calculateUnrealizedPL() {
        let unrealizedPL = 0;
        
        // Physical positions
        this.state.physicalPositions.forEach(pos => {
            if (pos.status === 'OPEN') {
                // Would need current market price to calculate
                // Placeholder - will implement with mark-to-market
            }
        });
        
        // Futures positions
        this.state.futuresPositions.forEach(pos => {
            if (pos.status === 'OPEN') {
                // Would need current futures price to calculate
                // Placeholder - will implement with mark-to-market
            }
        });
        
        this.state.unrealizedPL = unrealizedPL;
        this.state.totalPL = this.state.realizedPL + this.state.unrealizedPL;
    },
    
    /**
     * Advance to next month
     */
    advanceMonth() {
        // Save current month results
        this.monthlyResults.push({
            turn: this.state.currentTurn,
            month: this.state.currentMonth,
            openingFunds: this.state.practiceFunds,
            closingFunds: this.state.practiceFunds, // Will be updated
            realizedPL: this.state.realizedPL,
            transactions: this.state.transactions.filter(t => t.turn === this.state.currentTurn)
        });
        
        // Advance turn
        this.state.currentTurn++;
        this.updateCurrentMonthData();
        
        // Reset monthly tracking
        this.state.transactions = [];
        
        this.saveState();
    },
    
    /**
     * Get QP settlement month (M+1)
     */
    getQPMonth(turn) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return months[turn % 12];
    },
    
    /**
     * Record transaction
     */
    recordTransaction(transaction) {
        this.state.transactions.push({
            ...transaction,
            timestamp: new Date().toISOString()
        });
    },
    
    /**
     * Calculate freight for route
     */
    getFreightCost(originPort, destinationPort, shippingTerms) {
        if (!this.currentMonthData) return 0;
        
        const freightData = this.currentMonthData.LOGISTICS.FREIGHT_RATES[originPort];
        if (!freightData || !freightData[destinationPort]) return 0;
        
        const route = freightData[destinationPort];
        return shippingTerms === 'FOB' 
            ? route.FOB_RATE_USD_PER_TONNE 
            : route.CIF_RATE_USD_PER_TONNE;
    },
    
    /**
     * Get optimal route (cheapest freight)
     */
    getOptimalRoute(destinationPort) {
        if (!this.currentMonthData) return null;
        
        const origins = ['CALLAO', 'ANTOFAGASTA'];
        let bestRoute = null;
        let lowestCost = Infinity;
        
        origins.forEach(origin => {
            const freightData = this.currentMonthData.LOGISTICS.FREIGHT_RATES[origin];
            if (freightData && freightData[destinationPort]) {
                const cifCost = freightData[destinationPort].CIF_RATE_USD_PER_TONNE;
                if (cifCost < lowestCost) {
                    lowestCost = cifCost;
                    bestRoute = {
                        origin: origin,
                        destination: destinationPort,
                        cifCost: cifCost,
                        fobCost: freightData[destinationPort].FOB_RATE_USD_PER_TONNE,
                        distance: freightData[destinationPort].DISTANCE_NM,
                        travelTime: freightData[destinationPort].TRAVEL_TIME_DAYS
                    };
                }
            }
        });
        
        return bestRoute;
    },
    
    /**
     * Calculate cost of carry (2-month financing)
     */
    calculateCostOfCarry(amount) {
        if (!this.currentMonthData) return 0;
        
        const monthlyRate = this.currentMonthData.FIXED_RULES.COST_OF_CARRY.MONTHLY_RATE;
        const months = this.currentMonthData.FIXED_RULES.COST_OF_CARRY.FINANCING_PERIOD_MONTHS;
        
        return amount * monthlyRate * months;
    },
    
    /**
     * Get buying power
     */
    getBuyingPower() {
        return this.state.practiceFunds + (this.state.locLimit - this.state.locUsed);
    },
    
    /**
     * Validate trade
     */
    validateTrade(totalCost) {
        const buyingPower = this.getBuyingPower();
        if (totalCost > buyingPower) {
            return {
                valid: false,
                message: `Insufficient buying power. Need $${totalCost.toLocaleString()}, have $${buyingPower.toLocaleString()}`
            };
        }
        return { valid: true };
    },
    
    /**
     * Save state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem('tradingSimulatorState', JSON.stringify(this.state));
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    },
    
    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem('tradingSimulatorState');
            if (saved) {
                this.state = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    },
    
    /**
     * Reset game
     */
    resetGame() {
        if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
            this.state = {
                currentTurn: 1,
                currentMonth: 'January',
                practiceFunds: 200000,
                locUsed: 0,
                locLimit: 200000,
                physicalPositions: [],
                futuresPositions: [],
                realizedPL: 0,
                unrealizedPL: 0,
                totalPL: 0,
                transactions: [],
                monthlyResults: []
            };
            this.updateCurrentMonthData();
            this.saveState();
            location.reload();
        }
    },
    
    /**
     * Export game data
     */
    exportGameData() {
        const dataStr = JSON.stringify(this.state, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `trading_sim_export_${Date.now()}.json`;
        link.click();
    },
    
    /**
     * Import game data
     */
    importGameData(jsonData) {
        try {
            const importedState = JSON.parse(jsonData);
            this.state = importedState;
            this.updateCurrentMonthData();
            this.saveState();
            location.reload();
        } catch (e) {
            alert('Failed to import data: ' + e.message);
        }
    }
};

// Initialize on load
if (typeof window !== 'undefined') {
    window.GameStateManager = GameStateManager;
}
