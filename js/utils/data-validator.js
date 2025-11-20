/**
 * Data Validation Utility for Period-Based Trading Simulator
 * Validates month data consistency and completeness
 */

const DataValidator = {
    /**
     * Validate a single month's data structure
     * @param {Object} monthData - Month data object
     * @param {string} monthName - Name of the month
     * @returns {{valid: boolean, errors: Array<string>}}
     */
    validateMonthData(monthData, monthName) {
        const errors = [];

        if (!monthData) {
            return { valid: false, errors: [`${monthName}: Month data is null or undefined`] };
        }

        // Check required top-level fields
        const requiredFields = ['TURN', 'MONTH', 'MARKET_DEPTH', 'PRICING', 'LOGISTICS', 'FIXED_RULES', 'CLIENTS'];
        for (const field of requiredFields) {
            if (!monthData[field]) {
                errors.push(`${monthName}: Missing required field '${field}'`);
            }
        }

        // Validate PRICING structure
        if (monthData.PRICING) {
            // Check LME pricing
            if (!monthData.PRICING.LME) {
                errors.push(`${monthName}: Missing PRICING.LME`);
            } else {
                const requiredLME = ['SPOT_AVG', 'FUTURES_1M', 'FUTURES_3M', 'FUTURES_12M'];
                for (const field of requiredLME) {
                    if (typeof monthData.PRICING.LME[field] !== 'number') {
                        errors.push(`${monthName}: PRICING.LME.${field} missing or not a number`);
                    }
                }
            }

            // Check COMEX pricing
            if (!monthData.PRICING.COMEX) {
                errors.push(`${monthName}: Missing PRICING.COMEX`);
            } else {
                const requiredCOMEX = ['SPOT_AVG', 'FUTURES_1M', 'FUTURES_3M', 'FUTURES_12M'];
                for (const field of requiredCOMEX) {
                    if (typeof monthData.PRICING.COMEX[field] !== 'number') {
                        errors.push(`${monthName}: PRICING.COMEX.${field} missing or not a number`);
                    }
                }
            }

            // CRITICAL: Check M_PLUS_1 pricing (required for physical trades)
            if (!monthData.PRICING.M_PLUS_1) {
                errors.push(`${monthName}: MISSING CRITICAL FIELD 'PRICING.M_PLUS_1' (required for physical trades)`);
            } else {
                if (typeof monthData.PRICING.M_PLUS_1.LME_AVG !== 'number') {
                    errors.push(`${monthName}: PRICING.M_PLUS_1.LME_AVG missing or not a number`);
                }
                if (typeof monthData.PRICING.M_PLUS_1.COMEX_AVG !== 'number') {
                    errors.push(`${monthName}: PRICING.M_PLUS_1.COMEX_AVG missing or not a number`);
                }
            }
        }

        // Validate MARKET_DEPTH structure
        if (monthData.MARKET_DEPTH) {
            if (!monthData.MARKET_DEPTH.SUPPLY) {
                errors.push(`${monthName}: Missing MARKET_DEPTH.SUPPLY`);
            }
            if (!monthData.MARKET_DEPTH.DEMAND) {
                errors.push(`${monthName}: Missing MARKET_DEPTH.DEMAND`);
            }
        }

        // Validate LOGISTICS structure
        if (monthData.LOGISTICS) {
            if (!monthData.LOGISTICS.FREIGHT_RATES) {
                errors.push(`${monthName}: Missing LOGISTICS.FREIGHT_RATES`);
            } else {
                // Check for Callao and Antofagasta freight rates
                if (!monthData.LOGISTICS.FREIGHT_RATES.CALLAO) {
                    errors.push(`${monthName}: Missing freight rates for CALLAO`);
                }
                if (!monthData.LOGISTICS.FREIGHT_RATES.ANTOFAGASTA) {
                    errors.push(`${monthName}: Missing freight rates for ANTOFAGASTA`);
                }
            }
        }

        // Validate CLIENTS structure
        if (monthData.CLIENTS) {
            if (!monthData.CLIENTS.OPPORTUNITIES) {
                errors.push(`${monthName}: Missing CLIENTS.OPPORTUNITIES`);
            } else if (!Array.isArray(monthData.CLIENTS.OPPORTUNITIES)) {
                errors.push(`${monthName}: CLIENTS.OPPORTUNITIES must be an array`);
            }
        }

        // Validate FIXED_RULES
        if (monthData.FIXED_RULES) {
            if (!monthData.FIXED_RULES.COST_OF_CARRY) {
                errors.push(`${monthName}: Missing FIXED_RULES.COST_OF_CARRY`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Validate all loaded month data
     * @returns {{valid: boolean, summary: Object, details: Array}}
     */
    validateAllMonths() {
        const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE'];
        const results = [];
        let totalErrors = 0;

        for (const monthName of monthNames) {
            const dataKey = `${monthName}_DATA`;
            const monthData = window[dataKey];

            if (!monthData) {
                results.push({
                    month: monthName,
                    valid: false,
                    errors: [`${monthName}_DATA not found in window object`]
                });
                totalErrors++;
            } else {
                const validation = this.validateMonthData(monthData, monthName);
                results.push({
                    month: monthName,
                    valid: validation.valid,
                    errors: validation.errors
                });
                totalErrors += validation.errors.length;
            }
        }

        return {
            valid: totalErrors === 0,
            summary: {
                totalMonths: monthNames.length,
                validMonths: results.filter(r => r.valid).length,
                totalErrors: totalErrors
            },
            details: results
        };
    },

    /**
     * Print validation report to console
     */
    printValidationReport() {
        console.log('='.repeat(80));
        console.log('DATA VALIDATION REPORT - Period-Based Trading Simulator');
        console.log('='.repeat(80));

        const report = this.validateAllMonths();

        console.log(`\n📊 SUMMARY:`);
        console.log(`   Total Months: ${report.summary.totalMonths}`);
        console.log(`   Valid Months: ${report.summary.validMonths}`);
        console.log(`   Total Errors: ${report.summary.totalErrors}`);

        if (report.valid) {
            console.log(`\n✅ ALL MONTH DATA IS VALID`);
        } else {
            console.log(`\n❌ VALIDATION FAILED`);
            console.log(`\n🐛 ERRORS BY MONTH:`);
            for (const result of report.details) {
                if (!result.valid) {
                    console.log(`\n   ${result.month}:`);
                    for (const error of result.errors) {
                        console.log(`      ❌ ${error}`);
                    }
                }
            }
        }

        console.log('\n' + '='.repeat(80));

        return report;
    }
};

// Expose to window for console access
window.DataValidator = DataValidator;

export { DataValidator };
