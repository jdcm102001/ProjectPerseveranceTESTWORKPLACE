/**
 * ScenarioManager - Handles scenario loading and configuration
 *
 * Features:
 * - Load scenario manifests from JSON files
 * - Initialize game state from scenario config
 * - Support multiple scenarios
 * - Dynamic month data loading
 */

const ScenarioManager = {
    // Current loaded scenario
    currentScenario: null,

    // Available scenarios registry
    scenarios: {
        'bull_market_6mo': {
            id: 'bull_market_6mo',
            name: 'Bull Market 2025',
            manifestPath: 'scenarios/bull_market_6mo.json'
        }
        // Future scenarios can be added here
    },

    /**
     * Load a scenario by ID
     * @param {string} scenarioId - Scenario identifier
     * @returns {Promise<Object>} Loaded scenario manifest
     */
    async loadScenario(scenarioId) {
        const scenarioInfo = this.scenarios[scenarioId];

        if (!scenarioInfo) {
            throw new Error(`Scenario not found: ${scenarioId}`);
        }

        try {
            const response = await fetch(scenarioInfo.manifestPath);
            if (!response.ok) {
                throw new Error(`Failed to load scenario: HTTP ${response.status}`);
            }

            const manifest = await response.json();
            this.currentScenario = manifest;

            console.log(`📜 Loaded scenario: ${manifest.name} (${manifest.duration} months)`);

            return manifest;
        } catch (error) {
            console.error(`Failed to load scenario ${scenarioId}:`, error);
            throw error;
        }
    },

    /**
     * Load default scenario (bull_market_6mo)
     * @returns {Promise<Object>} Loaded scenario manifest
     */
    async loadDefaultScenario() {
        return await this.loadScenario('bull_market_6mo');
    },

    /**
     * Get initial game state from scenario
     * @param {Object} scenario - Scenario manifest
     * @returns {Object} Initial game state configuration
     */
    getInitialState(scenario) {
        if (!scenario) {
            throw new Error('No scenario provided');
        }

        return {
            practiceFunds: scenario.startingCapital || 200000,
            locLimit: scenario.locLimit || 200000,
            locUsed: 0,
            locInterestNextMonth: 0,
            totalPL: 0,
            totalFuturesPL: 0,
            physicalPositions: [],
            futuresPositions: [],
            futuresMarginPosted: 0,
            monthlyPurchases: {
                CALLAO_LTA: 0,
                CALLAO_SPOT: 0,
                ANTOFAGASTA_SPOT: 0
            },
            monthlySales: {
                AMERICAS: 0,
                ASIA: 0,
                EUROPE: 0
            }
        };
    },

    /**
     * Get month data file name for a given month number
     * @param {Object} scenario - Scenario manifest
     * @param {number} monthNumber - Month number (1-N)
     * @returns {string} Month data file name
     */
    getMonthDataFile(scenario, monthNumber) {
        if (!scenario || !scenario.months) {
            throw new Error('Invalid scenario or missing months data');
        }

        const monthIndex = monthNumber - 1;
        if (monthIndex < 0 || monthIndex >= scenario.months.length) {
            throw new Error(`Month ${monthNumber} out of range for scenario ${scenario.id}`);
        }

        return scenario.months[monthIndex].file;
    },

    /**
     * Get month data key for window object
     * @param {string} fileName - Month data file name (e.g., "january.js")
     * @returns {string} Window object key (e.g., "JANUARY_DATA")
     */
    getMonthDataKey(fileName) {
        // Extract month name from file name (e.g., "january.js" -> "JANUARY")
        const monthName = fileName.replace('.js', '').toUpperCase();
        return `${monthName}_DATA`;
    },

    /**
     * Load month data for a specific month in the scenario
     * @param {number} monthNumber - Month number (1-N)
     * @returns {Object} Month data from window object
     */
    loadMonthData(monthNumber) {
        if (!this.currentScenario) {
            throw new Error('No scenario loaded');
        }

        const fileName = this.getMonthDataFile(this.currentScenario, monthNumber);
        const dataKey = this.getMonthDataKey(fileName);

        if (!window[dataKey]) {
            throw new Error(`Month data not found: ${dataKey} (from ${fileName})`);
        }

        console.log(`📊 Loaded month ${monthNumber} data: ${dataKey}`);
        return window[dataKey];
    },

    /**
     * Get scenario scoring criteria
     * @param {Object} scenario - Scenario manifest
     * @returns {Object} Scoring criteria
     */
    getScoringCriteria(scenario) {
        return scenario.scoringCriteria || {
            excellent: { minProfitUSD: 50000, minROI: 25 },
            good: { minProfitUSD: 25000, minROI: 12.5 },
            passing: { minProfitUSD: 10000, minROI: 5 }
        };
    },

    /**
     * Calculate grade based on scenario scoring criteria
     * @param {number} totalPL - Total profit/loss
     * @param {number} startingCapital - Starting capital
     * @returns {Object} Grade info with grade, emoji, and criteria
     */
    calculateGrade(totalPL, startingCapital) {
        const scenario = this.currentScenario;
        const roi = ((totalPL / startingCapital) * 100);

        const criteria = this.getScoringCriteria(scenario);

        let grade, gradeEmoji, description;

        if (totalPL >= criteria.excellent.minProfitUSD && roi >= criteria.excellent.minROI) {
            grade = 'EXCELLENT';
            gradeEmoji = '🏆';
            description = 'Outstanding performance! You maximized profits in a bull market.';
        } else if (totalPL >= criteria.good.minProfitUSD && roi >= criteria.good.minROI) {
            grade = 'GOOD';
            gradeEmoji = '🥈';
            description = 'Strong performance. You capitalized on market opportunities.';
        } else if (totalPL >= criteria.passing.minProfitUSD && roi >= criteria.passing.minROI) {
            grade = 'PASSING';
            gradeEmoji = '✅';
            description = 'Adequate performance. You maintained profitability.';
        } else {
            grade = 'NEEDS IMPROVEMENT';
            gradeEmoji = '📈';
            description = 'There\'s room for improvement. Review your trading strategy.';
        }

        return {
            grade,
            gradeEmoji,
            description,
            roi: roi.toFixed(2),
            criteria
        };
    },

    /**
     * Get scenario metadata
     * @returns {Object} Current scenario metadata
     */
    getScenarioInfo() {
        if (!this.currentScenario) {
            return null;
        }

        return {
            id: this.currentScenario.id,
            name: this.currentScenario.name,
            description: this.currentScenario.description,
            difficulty: this.currentScenario.difficulty,
            duration: this.currentScenario.duration,
            totalTurns: this.currentScenario.duration * 2, // 2 periods per month
            startingCapital: this.currentScenario.startingCapital,
            locLimit: this.currentScenario.locLimit
        };
    },

    /**
     * Validate scenario manifest
     * @param {Object} scenario - Scenario manifest
     * @returns {boolean} True if valid
     * @throws {Error} If validation fails
     */
    validateScenario(scenario) {
        const required = ['id', 'name', 'duration', 'startingCapital', 'locLimit', 'months'];

        for (const field of required) {
            if (!scenario[field]) {
                throw new Error(`Scenario missing required field: ${field}`);
            }
        }

        if (scenario.months.length !== scenario.duration) {
            throw new Error(`Scenario duration (${scenario.duration}) does not match months array length (${scenario.months.length})`);
        }

        console.log('✅ Scenario validation passed');
        return true;
    },

    /**
     * Get available scenarios list
     * @returns {Array} List of available scenarios
     */
    getAvailableScenarios() {
        return Object.values(this.scenarios).map(s => ({
            id: s.id,
            name: s.name
        }));
    }
};

// Export for ES6 modules
export { ScenarioManager };

// Also expose globally for console access
window.ScenarioManager = ScenarioManager;
