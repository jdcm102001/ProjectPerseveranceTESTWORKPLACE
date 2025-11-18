/**
 * Price Exposure Warning System
 * Triggers educational warnings when user's unhedged exposure increases
 * Uses sessionStorage to avoid showing same warning repeatedly
 */

const ExposureWarnings = {
    // Track which warnings have been shown this session
    warningsShown: {
        threshold30: false,
        threshold50: false,
        unhedgedPosition: false
    },

    init() {
        // Load warning state from sessionStorage
        const stored = sessionStorage.getItem('exposureWarningsShown');
        if (stored) {
            try {
                this.warningsShown = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse warning state:', e);
            }
        }
    },

    saveState() {
        sessionStorage.setItem('exposureWarningsShown', JSON.stringify(this.warningsShown));
    },

    /**
     * Check if warning should be shown based on exposure data
     * Called after physical position opened or futures hedge closed
     */
    checkAndShowWarning(exposureData, trigger = 'general') {
        const { exposurePercentage, totalExposure, hasHighRisk } = exposureData;

        // Check 50% threshold (EXTREME risk)
        if (exposurePercentage >= 50 && !this.warningsShown.threshold50) {
            this.showThresholdWarning(exposureData, 50);
            this.warningsShown.threshold50 = true;
            this.saveState();
            return;
        }

        // Check 30% threshold (HIGH risk)
        if (exposurePercentage >= 30 && !this.warningsShown.threshold30) {
            this.showThresholdWarning(exposureData, 30);
            this.warningsShown.threshold30 = true;
            this.saveState();
            return;
        }

        // Check unhedged position (triggered when opening position without hedge)
        if (trigger === 'unhedgedPosition' && exposurePercentage > 0 && !this.warningsShown.unhedgedPosition) {
            this.showUnhedgedPositionWarning(exposureData);
            this.warningsShown.unhedgedPosition = true;
            this.saveState();
            return;
        }
    },

    /**
     * Show threshold crossing warning (30% or 50%)
     */
    showThresholdWarning(exposureData, threshold) {
        const { exposurePercentage, totalExposure, riskLevel } = exposureData;

        const urgencyText = threshold >= 50
            ? '🔴 URGENT: EXTREME RISK'
            : '⚠️ WARNING: HIGH RISK';

        const impactText = threshold >= 50
            ? 'More than half your capital is exposed to price changes!'
            : 'Nearly a third of your capital is exposed to price changes.';

        this.showModal({
            title: `⚠️ PRICE EXPOSURE ALERT`,
            content: `
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 24px; font-weight: 700; color: #ef4444; margin-bottom: 10px;">
                        ${urgencyText}
                    </div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--text-primary);">
                        $${Math.round(totalExposure).toLocaleString('en-US')} exposed (${exposurePercentage.toFixed(1)}% of capital)
                    </div>
                </div>

                <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <div style="font-size: 14px; line-height: 1.6; color: var(--text-primary);">
                        ${impactText}
                    </div>
                    <div style="font-size: 14px; margin-top: 10px; font-weight: 600; color: #ef4444;">
                        If copper price drops 10%, you could lose $${Math.round(totalExposure * 0.1).toLocaleString('en-US')}
                    </div>
                </div>

                <div style="margin: 20px 0;">
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 15px; color: var(--text-primary);">
                        📚 RISK MANAGEMENT OPTIONS:
                    </div>

                    <div style="margin-bottom: 15px;">
                        <div style="font-weight: 600; color: #3b82f6; margin-bottom: 5px;">1. Open SHORT futures to lock in price</div>
                        <div style="font-size: 13px; line-height: 1.5; color: var(--text-secondary);">
                            Match your physical tonnage with SHORT futures contracts. When physical copper loses value, futures gain value. This protects your profit margin.
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <div style="font-weight: 600; color: #3b82f6; margin-bottom: 5px;">2. Reduce position size</div>
                        <div style="font-size: 13px; line-height: 1.5; color: var(--text-secondary);">
                            Consider selling some positions early or reducing future purchases until you're comfortable with the risk level.
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <div style="font-weight: 600; color: #3b82f6; margin-bottom: 5px;">3. Monitor prices closely</div>
                        <div style="font-size: 13px; line-height: 1.5; color: var(--text-secondary);">
                            Line up a buyer quickly to minimize time exposed to price changes. The faster you sell, the less risk you carry.
                        </div>
                    </div>
                </div>

                <div style="padding: 15px; background: rgba(59, 130, 246, 0.1); border-radius: 6px; margin-top: 20px;">
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-primary);">
                        💡 <strong>Professional traders ALWAYS hedge or actively monitor exposure.</strong><br>
                        This is the #1 habit that separates pros from amateurs.
                    </div>
                </div>
            `,
            buttons: [
                {
                    text: 'Understood - I accept the risk',
                    style: 'primary',
                    onClick: () => this.closeModal()
                },
                {
                    text: 'Learn More',
                    style: 'secondary',
                    onClick: () => this.showEducationalModal()
                }
            ]
        });
    },

    /**
     * Show warning when opening unhedged position
     */
    showUnhedgedPositionWarning(exposureData) {
        const { totalExposure, exposurePercentage } = exposureData;

        this.showModal({
            title: '⚠️ UNHEDGED POSITION ALERT',
            content: `
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 18px; font-weight: 600; color: #fbbf24;">
                        You now have unhedged price exposure
                    </div>
                    <div style="font-size: 16px; margin-top: 10px; color: var(--text-primary);">
                        $${Math.round(totalExposure).toLocaleString('en-US')} at risk (${exposurePercentage.toFixed(1)}% of capital)
                    </div>
                </div>

                <div style="background: rgba(251, 191, 36, 0.1); border-left: 4px solid #fbbf24; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <div style="font-size: 14px; line-height: 1.6; color: var(--text-primary);">
                        Your physical copper position is not protected by futures. If prices move against you, this position will lose value.
                    </div>
                </div>

                <div style="margin: 20px 0;">
                    <div style="font-size: 14px; line-height: 1.6; color: var(--text-primary);">
                        <strong>What this means:</strong><br>
                        • Price drops = You lose money<br>
                        • Price rises = You gain money<br>
                        • You're fully exposed to market volatility
                    </div>
                </div>

                <div style="padding: 15px; background: rgba(59, 130, 246, 0.1); border-radius: 6px;">
                    <div style="font-size: 13px; line-height: 1.6; color: var(--text-primary);">
                        💡 <strong>Consider opening SHORT futures</strong> to protect this position from price risk.
                    </div>
                </div>
            `,
            buttons: [
                {
                    text: 'Understood - I accept the risk',
                    style: 'primary',
                    onClick: () => this.closeModal()
                },
                {
                    text: 'Learn More',
                    style: 'secondary',
                    onClick: () => this.showEducationalModal()
                }
            ]
        });
    },

    /**
     * Show educational modal (Learn More)
     */
    showEducationalModal() {
        this.showModal({
            title: '📚 UNDERSTANDING PRICE EXPOSURE',
            content: `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 10px; color: var(--text-primary);">
                        What is price exposure?
                    </div>
                    <div style="font-size: 14px; line-height: 1.6; color: var(--text-secondary);">
                        When you own physical copper, its value changes with market prices. If prices drop, you lose money. If prices rise, you gain.
                    </div>
                </div>

                <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <div style="font-weight: 600; margin-bottom: 10px; color: var(--text-primary);">Example:</div>
                    <div style="font-size: 14px; line-height: 1.6; color: var(--text-primary);">
                        • You bought 10 MT at $9,000/MT = $90,000 cost<br>
                        • Price drops to $8,000/MT<br>
                        • Your position now worth $80,000<br>
                        • <strong style="color: #ef4444;">Unrealized loss: $10,000</strong>
                    </div>
                </div>

                <div style="margin: 20px 0;">
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 15px; color: var(--text-primary);">
                        How to manage risk:
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="font-weight: 600; color: #10b981; margin-bottom: 8px;">1. HEDGE WITH FUTURES</div>
                        <div style="font-size: 14px; line-height: 1.6; color: var(--text-secondary); padding-left: 15px;">
                            Open a SHORT futures position matching your physical tonnage. When physical copper loses value, futures gain value. This locks in your profit margin.
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="font-weight: 600; color: #10b981; margin-bottom: 8px;">2. REDUCE POSITION SIZE</div>
                        <div style="font-size: 14px; line-height: 1.6; color: var(--text-secondary); padding-left: 15px;">
                            Trade smaller quantities until you're comfortable with risk. Start with 5-10 MT instead of 50 MT. Build up as you gain experience.
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <div style="font-weight: 600; color: #10b981; margin-bottom: 8px;">3. SELL QUICKLY</div>
                        <div style="font-size: 14px; line-height: 1.6; color: var(--text-secondary); padding-left: 15px;">
                            Line up a buyer before copper arrives. Reduces time exposed to price changes. Minimizes risk of market moving against you.
                        </div>
                    </div>
                </div>

                <div style="padding: 15px; background: rgba(59, 130, 246, 0.1); border-radius: 6px; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 14px; line-height: 1.6; font-weight: 600; color: var(--text-primary);">
                        💼 Professional traders ALWAYS hedge or monitor exposure actively.<br>
                        This is the #1 habit that separates pros from amateurs.
                    </div>
                </div>
            `,
            buttons: [
                {
                    text: 'Close',
                    style: 'primary',
                    onClick: () => this.closeModal()
                }
            ]
        });
    },

    /**
     * Generic modal display function
     */
    showModal({ title, content, buttons }) {
        // Remove existing modal if any
        const existing = document.getElementById('exposureWarningModal');
        if (existing) existing.remove();

        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'exposureWarningModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        // Create modal content
        const modalContent = `
            <div style="
                background: var(--bg-secondary);
                border: 2px solid #ef4444;
                border-radius: 12px;
                width: 600px;
                max-width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                animation: slideUp 0.3s ease;
            ">
                <div style="
                    background: rgba(239, 68, 68, 0.2);
                    padding: 20px;
                    border-bottom: 2px solid #ef4444;
                    border-radius: 10px 10px 0 0;
                ">
                    <div style="
                        color: #ef4444;
                        font-size: 18px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">${title}</div>
                </div>

                <div style="padding: 25px; color: var(--text-primary);">
                    ${content}

                    <div style="margin-top: 25px; display: flex; gap: 10px; justify-content: flex-end;">
                        ${buttons.map(btn => `
                            <button
                                class="modal-btn modal-btn-${btn.style}"
                                style="
                                    padding: 12px 24px;
                                    border: none;
                                    border-radius: 6px;
                                    font-size: 14px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                    ${btn.style === 'primary'
                                        ? 'background: linear-gradient(135deg, #3b82f6, #2563eb); color: white;'
                                        : 'background: transparent; border: 2px solid #3b82f6; color: #3b82f6;'
                                    }
                                "
                                onmouseover="this.style.transform='translateY(-2px)'"
                                onmouseout="this.style.transform='translateY(0)'"
                            >${btn.text}</button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        modal.innerHTML = modalContent;

        // Attach button click handlers
        document.body.appendChild(modal);

        // Wire up button handlers
        const modalButtons = modal.querySelectorAll('.modal-btn');
        modalButtons.forEach((btn, index) => {
            btn.addEventListener('click', buttons[index].onClick);
        });

        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    },

    closeModal() {
        const modal = document.getElementById('exposureWarningModal');
        if (modal) {
            modal.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => modal.remove(), 200);
        }
    }
};

// Initialize on load
if (typeof window !== 'undefined') {
    ExposureWarnings.init();
}

export { ExposureWarnings };
