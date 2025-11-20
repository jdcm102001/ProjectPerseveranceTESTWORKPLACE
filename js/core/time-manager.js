/**
 * TimeManager - Handles all period-based time calculations
 *
 * Converts between:
 * - Turn numbers (1-12): Global turn counter
 * - Month + Period: Month (1-6) + Period (1=Early, 2=Late)
 * - Day numbers: Days 1-30 within a month
 *
 * Period System:
 * - Each month has 2 periods: Early (days 1-15) and Late (days 16-30)
 * - 6 months × 2 periods = 12 turns total
 * - Turn 1 = January Early, Turn 2 = January Late, etc.
 */

const TimeManager = {
    /**
     * Convert month and period to global turn number
     * @param {number} month - Month number (1-6)
     * @param {number} period - Period (1=Early, 2=Late)
     * @returns {number} Turn number (1-12)
     */
    getTurnNumber(month, period) {
        if (month < 1 || month > 6) {
            throw new Error(`Invalid month: ${month}. Must be 1-6.`);
        }
        if (period !== 1 && period !== 2) {
            throw new Error(`Invalid period: ${period}. Must be 1 or 2.`);
        }
        return (month - 1) * 2 + period;
    },

    /**
     * Convert turn number to month and period
     * @param {number} turn - Turn number (1-12)
     * @returns {{month: number, period: number}} Month (1-6) and period (1-2)
     */
    getMonthPeriod(turn) {
        if (turn < 1 || turn > 12) {
            throw new Error(`Invalid turn: ${turn}. Must be 1-12.`);
        }
        const month = Math.ceil(turn / 2);
        const period = (turn % 2 === 0) ? 2 : 1;
        return { month, period };
    },

    /**
     * Get period (1 or 2) from day number within month
     * @param {number} day - Day of month (1-30)
     * @returns {number} Period (1=Early for days 1-15, 2=Late for days 16-30)
     */
    getPeriodFromDay(day) {
        if (day < 1 || day > 30) {
            throw new Error(`Invalid day: ${day}. Must be 1-30.`);
        }
        return day <= 15 ? 1 : 2;
    },

    /**
     * Get month name from month number
     * @param {number} monthNumber - Month (1-6)
     * @returns {string} Month name
     */
    getMonthName(monthNumber) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June'];
        if (monthNumber < 1 || monthNumber > 6) {
            throw new Error(`Invalid month number: ${monthNumber}. Must be 1-6.`);
        }
        return months[monthNumber - 1];
    },

    /**
     * Get period name from period number
     * @param {number} period - Period (1 or 2)
     * @returns {string} Period name ("Early" or "Late")
     */
    getPeriodName(period) {
        if (period === 1) return 'Early';
        if (period === 2) return 'Late';
        throw new Error(`Invalid period: ${period}. Must be 1 or 2.`);
    },

    /**
     * Check if advancing from one period to another crosses a month boundary
     * @param {number} oldMonth - Previous month (1-6)
     * @param {number} oldPeriod - Previous period (1-2)
     * @param {number} newMonth - New month (1-6)
     * @param {number} newPeriod - New period (1-2)
     * @returns {boolean} True if month boundary crossed
     */
    isMonthBoundary(oldMonth, oldPeriod, newMonth, newPeriod) {
        return newMonth !== oldMonth;
    },

    /**
     * Calculate arrival month and period based on purchase timing and travel days
     * @param {number} purchaseMonth - Month of purchase (1-6)
     * @param {number} purchasePeriod - Period of purchase (1-2)
     * @param {number} travelDays - Travel time in days
     * @returns {{arrivalMonth: number, arrivalPeriod: number}} Arrival timing
     */
    calculateArrival(purchaseMonth, purchasePeriod, travelDays) {
        // Convert period to approximate day (midpoint of period)
        // Early (Period 1) → Day 8 (midpoint of 1-15)
        // Late (Period 2) → Day 23 (midpoint of 16-30)
        const purchaseDay = purchasePeriod === 1 ? 8 : 23;

        // Calculate arrival day
        const arrivalDay = purchaseDay + travelDays;

        // Convert to absolute day number (across all months)
        const absoluteDay = (purchaseMonth - 1) * 30 + arrivalDay;

        // Convert back to month + period
        let arrivalMonth = Math.floor(absoluteDay / 30) + 1;
        const dayInMonth = ((absoluteDay - 1) % 30) + 1;
        const arrivalPeriod = dayInMonth <= 15 ? 1 : 2;

        // Cap at Month 6 Late (game ends at turn 12)
        if (arrivalMonth > 6) {
            arrivalMonth = 6;
        }

        return { arrivalMonth, arrivalPeriod };
    },

    /**
     * Calculate settlement timing (M+2 system)
     * QP is M+1 (next month average). Settlement occurs AFTER QP month completes.
     * Settlement = first period of (purchase month + 2)
     *
     * Example: Buy January → QP = Feb avg → Settlement = March Early
     *
     * @param {number} purchaseMonth - Month of purchase (1-6)
     * @param {number} purchasePeriod - Period of purchase (1-2)
     * @returns {{settlementMonth: number, settlementPeriod: number}} Settlement timing
     */
    calculateSettlement(purchaseMonth, purchasePeriod) {
        // Settlement month is always purchase month + 2
        const settlementMonth = purchaseMonth + 2;

        // Settlement always occurs in the EARLY period (period 1)
        // This is the first period after the QP month completes
        const settlementPeriod = 1;

        // Cap at game end (June Late = Turn 12)
        if (settlementMonth > 6) {
            return {
                settlementMonth: 6,
                settlementPeriod: 2  // Last turn of game
            };
        }

        return { settlementMonth, settlementPeriod };
    },

    /**
     * Advance to next period
     * @param {number} currentMonth - Current month (1-6)
     * @param {number} currentPeriod - Current period (1-2)
     * @returns {{month: number, period: number, isGameEnd: boolean}} Next period info
     */
    advancePeriod(currentMonth, currentPeriod) {
        const currentTurn = this.getTurnNumber(currentMonth, currentPeriod);

        // Check if game ends
        if (currentTurn >= 12) {
            return {
                month: 6,
                period: 2,
                isGameEnd: true
            };
        }

        const nextTurn = currentTurn + 1;
        const { month, period } = this.getMonthPeriod(nextTurn);

        return {
            month,
            period,
            isGameEnd: false
        };
    },

    /**
     * Format period display string
     * @param {number} month - Month (1-6)
     * @param {number} period - Period (1-2)
     * @returns {string} Formatted string (e.g., "JAN - Early")
     */
    formatPeriod(month, period) {
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'];
        const periodName = this.getPeriodName(period);
        return `${monthNames[month - 1]} - ${periodName}`;
    },

    /**
     * Calculate number of periods between two points in time
     * @param {number} fromMonth - Starting month (1-6)
     * @param {number} fromPeriod - Starting period (1-2)
     * @param {number} toMonth - Ending month (1-6)
     * @param {number} toPeriod - Ending period (1-2)
     * @returns {number} Number of periods between
     */
    periodsBetween(fromMonth, fromPeriod, toMonth, toPeriod) {
        const fromTurn = this.getTurnNumber(fromMonth, fromPeriod);
        const toTurn = this.getTurnNumber(toMonth, toPeriod);
        return Math.max(0, toTurn - fromTurn);
    }
};

// Export for ES6 modules
export { TimeManager };

// Also expose globally for HTML onclick handlers
window.TimeManager = TimeManager;
