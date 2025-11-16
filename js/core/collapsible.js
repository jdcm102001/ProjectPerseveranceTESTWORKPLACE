/* ==========================================
   UNIVERSAL COLLAPSIBLE SECTIONS
   ========================================== */

/**
 * Initialize collapsible functionality for all .section-title elements
 * Adds collapse indicator (arrow) and click handler
 */
function initCollapsibles() {
    // Find all section titles
    document.querySelectorAll('.section-title').forEach(title => {
        // Skip if already initialized
        if (title.querySelector('.collapse-indicator')) return;

        // Add collapse indicator (arrow icon)
        const indicator = document.createElement('span');
        indicator.className = 'collapse-indicator';
        indicator.textContent = '▼';
        indicator.style.cssText = `
            cursor: pointer;
            float: right;
            font-size: 14px;
            transition: transform 0.3s ease;
            user-select: none;
            color: rgba(255, 255, 255, 0.6);
            margin-left: 10px;
        `;

        title.style.cursor = 'pointer';
        title.style.userSelect = 'none';
        title.appendChild(indicator);

        // Find the content to collapse (next sibling element)
        const content = title.nextElementSibling;
        if (!content) return;

        content.classList.add('collapsible-content');

        // CRITICAL: Set proper CSS for collapse/expand animation
        content.style.transition = 'max-height 0.4s ease, opacity 0.3s ease, padding 0.3s ease, margin 0.3s ease';
        content.style.overflow = 'hidden';

        // START EXPANDED - set to actual height
        content.style.maxHeight = 'none'; // Allow natural height
        content.style.opacity = '1';
        content.dataset.expanded = 'true';

        // Store original padding/margin
        const computedStyle = window.getComputedStyle(content);
        content.dataset.originalPaddingTop = computedStyle.paddingTop;
        content.dataset.originalPaddingBottom = computedStyle.paddingBottom;
        content.dataset.originalMarginTop = computedStyle.marginTop;
        content.dataset.originalMarginBottom = computedStyle.marginBottom;

        // Click handler to toggle
        title.addEventListener('click', (e) => {
            // Don't collapse if clicking a button inside the title
            if (e.target.tagName === 'BUTTON' || (e.target.tagName === 'SPAN' && e.target !== indicator)) {
                return;
            }

            const isExpanded = content.dataset.expanded === 'true';

            if (isExpanded) {
                // COLLAPSE - hide content, space adjusts
                const currentHeight = content.scrollHeight;

                // Set explicit height first (for transition)
                content.style.maxHeight = currentHeight + 'px';

                // Force reflow
                content.offsetHeight;

                // Now collapse to 0
                requestAnimationFrame(() => {
                    content.style.maxHeight = '0';
                    content.style.opacity = '0';
                    content.style.paddingTop = '0';
                    content.style.paddingBottom = '0';
                    content.style.marginTop = '0';
                    content.style.marginBottom = '0';
                    indicator.style.transform = 'rotate(-90deg)';
                    indicator.textContent = '▶';
                    content.dataset.expanded = 'false';
                });
            } else {
                // EXPAND - show content, space adjusts
                const targetHeight = content.scrollHeight;

                // Restore padding/margin first
                content.style.paddingTop = content.dataset.originalPaddingTop || '';
                content.style.paddingBottom = content.dataset.originalPaddingBottom || '';
                content.style.marginTop = content.dataset.originalMarginTop || '';
                content.style.marginBottom = content.dataset.originalMarginBottom || '';

                // Expand to calculated height
                content.style.maxHeight = targetHeight + 'px';
                content.style.opacity = '1';
                indicator.style.transform = 'rotate(0deg)';
                indicator.textContent = '▼';
                content.dataset.expanded = 'true';

                // After transition, remove max-height constraint
                setTimeout(() => {
                    if (content.dataset.expanded === 'true') {
                        content.style.maxHeight = 'none';
                    }
                }, 400);
            }
        });
    });
}

/**
 * Re-initialize collapsibles after new content is added
 * Call this after rendering widgets or updating tables
 */
function refreshCollapsibles() {
    setTimeout(() => initCollapsibles(), 100);
}

export { initCollapsibles, refreshCollapsibles };
