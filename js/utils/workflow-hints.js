/**
 * Workflow Hints System
 * Shows first-time user hints to guide through trading workflow
 * Uses localStorage to track which hints have been shown/dismissed
 */

const WorkflowHints = {
    // Track hint states
    hints: {
        firstBuy: false,
        firstHedge: false,
        firstSell: false,
        cycleComplete: false
    },

    init() {
        // Load hint states from localStorage
        const stored = localStorage.getItem('workflowHintsShown');
        if (stored) {
            try {
                this.hints = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse workflow hints state:', e);
            }
        }

        // Check and show appropriate hint on load
        this.checkAndShowHints();
    },

    saveState() {
        localStorage.setItem('workflowHintsShown', JSON.stringify(this.hints));
    },

    /**
     * Check game state and show appropriate hints
     */
    checkAndShowHints() {
        const state = window.GAME_STATE?.state;
        if (!state) return;

        const hasPhysicalPositions = state.physicalPositions && state.physicalPositions.length > 0;
        const hasFuturesPositions = state.futuresPositions && state.futuresPositions.length > 0;
        const hasSoldPositions = state.physicalPositions && state.physicalPositions.some(p => p.soldInfo);

        // Hint 1: First buy (show if no positions and hint not shown)
        if (!hasPhysicalPositions && !this.hints.firstBuy) {
            this.showHint('firstBuy', 'suppliersTable');
            return; // Only show one hint at a time
        }

        // Hint 2: First hedge (show if has physical position but no futures and hint not shown)
        if (hasPhysicalPositions && !hasFuturesPositions && !this.hints.firstHedge) {
            this.showHint('firstHedge', 'futuresChart');
            return;
        }

        // Hint 3: First sell (show if has positions and hedge but hasn't sold yet)
        if (hasPhysicalPositions && hasFuturesPositions && !hasSoldPositions && !this.hints.firstSell) {
            this.showHint('firstSell', 'buyersTable');
            return;
        }

        // Hint 4: Cycle complete (show if completed full cycle)
        if (hasSoldPositions && !this.hints.cycleComplete) {
            this.showHint('cycleComplete', null);
            return;
        }
    },

    /**
     * Show specific hint
     */
    showHint(hintType, targetElementId) {
        const hintConfig = {
            firstBuy: {
                icon: '👋',
                title: 'Start Your First Trade',
                message: 'Buy copper from <strong>This Month\'s Supplier</strong> below. Choose your tonnage and click TRADE.',
                color: '#3b82f6'
            },
            firstHedge: {
                icon: '📊',
                title: 'Hedge Your Price Risk',
                message: 'Open a <strong>SHORT futures position</strong> to protect against price drops. Match your physical tonnage.',
                color: '#10b981'
            },
            firstSell: {
                icon: '💰',
                title: 'Complete the Cycle',
                message: 'Sell your copper to <strong>This Month\'s Buyer</strong> below to lock in your profit.',
                color: '#f59e0b'
            },
            cycleComplete: {
                icon: '🎯',
                title: 'Congratulations!',
                message: 'You\'ve completed a full trading cycle: <strong>Buy → Hedge → Sell</strong>. Keep trading to maximize profits!',
                color: '#8b5cf6'
            }
        };

        const config = hintConfig[hintType];
        if (!config) return;

        // Special handling for cycle complete (modal instead of inline)
        if (hintType === 'cycleComplete') {
            this.showCycleCompleteModal(config);
            return;
        }

        // Find target element or use body
        const targetElement = targetElementId ?
            document.getElementById(targetElementId)?.closest('.markets-widget-content, .futures-graph-container') :
            document.body;

        if (!targetElement) return;

        // Create hint element
        const hintId = `workflow-hint-${hintType}`;

        // Remove existing hint if any
        const existingHint = document.getElementById(hintId);
        if (existingHint) existingHint.remove();

        const hint = document.createElement('div');
        hint.id = hintId;
        hint.style.cssText = `
            margin: 15px 0;
            padding: 12px 15px;
            background: linear-gradient(135deg, ${config.color}22, ${config.color}11);
            border-left: 4px solid ${config.color};
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideInDown 0.4s ease;
        `;

        hint.innerHTML = `
            <div style="font-size: 24px;">${config.icon}</div>
            <div style="flex: 1;">
                <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
                    ${config.title}
                </div>
                <div style="font-size: 12px; line-height: 1.5; color: var(--text-secondary);">
                    ${config.message}
                </div>
            </div>
            <button onclick="window.WorkflowHints.dismissHint('${hintType}')" style="
                background: none;
                border: none;
                color: #888;
                font-size: 20px;
                cursor: pointer;
                padding: 0 8px;
                transition: color 0.2s;
            " onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#888'">×</button>
        `;

        // Add CSS animation
        if (!document.getElementById('workflow-hints-animations')) {
            const style = document.createElement('style');
            style.id = 'workflow-hints-animations';
            style.textContent = `
                @keyframes slideInDown {
                    from {
                        transform: translateY(-20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Insert hint at top of target element
        if (targetElementId === 'suppliersTable') {
            // Insert before suppliers table
            const table = document.getElementById('suppliersTable');
            if (table) table.parentElement.insertBefore(hint, table);
        } else if (targetElementId === 'buyersTable') {
            // Insert before buyers table
            const table = document.getElementById('buyersTable');
            if (table) table.parentElement.insertBefore(hint, table);
        } else if (targetElementId === 'futuresChart') {
            // Insert at top of futures graph container
            const container = document.querySelector('.futures-graph-container');
            if (container) container.insertBefore(hint, container.firstChild);
        }
    },

    /**
     * Show cycle complete modal
     */
    showCycleCompleteModal(config) {
        const modal = document.createElement('div');
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

        modal.innerHTML = `
            <div style="
                background: var(--bg-secondary);
                border: 2px solid ${config.color};
                border-radius: 12px;
                width: 500px;
                max-width: 90%;
                padding: 30px;
                text-align: center;
                animation: slideUp 0.3s ease;
            ">
                <div style="font-size: 64px; margin-bottom: 20px;">${config.icon}</div>
                <div style="font-size: 20px; font-weight: 700; color: ${config.color}; margin-bottom: 15px;">
                    ${config.title}
                </div>
                <div style="font-size: 15px; line-height: 1.6; color: var(--text-primary); margin-bottom: 25px;">
                    ${config.message}
                </div>
                <button onclick="window.WorkflowHints.dismissHint('cycleComplete', true)" style="
                    background: linear-gradient(135deg, ${config.color}, ${config.color}dd);
                    border: none;
                    color: white;
                    padding: 12px 30px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    Continue Trading
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Add animations
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

    /**
     * Dismiss hint and mark as shown
     */
    dismissHint(hintType, isModal = false) {
        // Mark hint as shown
        this.hints[hintType] = true;
        this.saveState();

        // Remove hint element
        if (isModal) {
            // Remove modal
            const modals = document.querySelectorAll('[style*="position: fixed"]');
            modals.forEach(modal => {
                if (modal.textContent.includes('Continue Trading')) {
                    modal.style.animation = 'fadeOut 0.2s ease';
                    setTimeout(() => modal.remove(), 200);
                }
            });
        } else {
            // Remove inline hint
            const hint = document.getElementById(`workflow-hint-${hintType}`);
            if (hint) {
                hint.style.animation = 'slideOutUp 0.3s ease';
                setTimeout(() => hint.remove(), 300);
            }
        }

        // Check if we should show next hint
        setTimeout(() => this.checkAndShowHints(), 500);
    }
};

// Initialize on load
if (typeof window !== 'undefined') {
    WorkflowHints.init();
    window.WorkflowHints = WorkflowHints; // Expose globally for onclick handlers
}

export { WorkflowHints };
