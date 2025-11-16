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
        content.style.transition = 'max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease';
        content.style.overflow = 'hidden';

        // Set initial max-height
        const initialHeight = content.scrollHeight;
        content.style.maxHeight = initialHeight + 'px';
        content.style.opacity = '1';
        content.dataset.expanded = 'true';

        // Click handler to toggle
        title.addEventListener('click', (e) => {
            // Don't collapse if clicking a button inside the title
            if (e.target.tagName === 'BUTTON' || (e.target.tagName === 'SPAN' && e.target !== indicator)) {
                return;
            }

            const isExpanded = content.dataset.expanded === 'true';

            if (isExpanded) {
                // COLLAPSE
                content.style.maxHeight = '0';
                content.style.opacity = '0';
                content.style.marginTop = '0';
                content.style.marginBottom = '0';
                indicator.style.transform = 'rotate(-90deg)';
                indicator.textContent = '▶';
                content.dataset.expanded = 'false';
            } else {
                // EXPAND
                const newHeight = content.scrollHeight;
                content.style.maxHeight = newHeight + 'px';
                content.style.opacity = '1';
                content.style.marginTop = '';
                content.style.marginBottom = '';
                indicator.style.transform = 'rotate(0deg)';
                indicator.textContent = '▼';
                content.dataset.expanded = 'true';

                // Update max-height after transition in case content changed
                setTimeout(() => {
                    if (content.dataset.expanded === 'true') {
                        content.style.maxHeight = content.scrollHeight + 'px';
                    }
                }, 350);
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
