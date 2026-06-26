/**
 * UI Utilities Module - Common UI helper functions
 * Handles tooltips, modals, and DOM manipulations
 */

const UIUtils = (() => {
    let hoverTooltip = null;

    /**
     * Create or get hover tooltip element
     * @returns {HTMLElement} Tooltip element
     */
    function getHoverTooltip() {
        if (hoverTooltip) return hoverTooltip;

        hoverTooltip = document.createElement('div');
        hoverTooltip.id = 'cardHoverTooltip';
        hoverTooltip.style.position = 'fixed';
        hoverTooltip.style.zIndex = '2000';
        hoverTooltip.style.display = 'none';
        hoverTooltip.style.background = '#222';
        hoverTooltip.style.border = '1px solid #555';
        hoverTooltip.style.padding = '10px';
        hoverTooltip.style.borderRadius = '8px';
        hoverTooltip.style.maxWidth = '320px';
        hoverTooltip.style.color = '#eee';
        hoverTooltip.style.boxShadow = '0 0 15px rgba(0,0,0,0.7)';
        hoverTooltip.style.pointerEvents = 'none';
        document.body.appendChild(hoverTooltip);

        return hoverTooltip;
    }

    /**
     * Show card hover tooltip
     * @param {Object} card - Card data
     * @param {number} x - Mouse X position
     * @param {number} y - Mouse Y position
     */
    function showCardTooltip(card, x, y) {
        if (!card) return;

        const tooltip = getHoverTooltip();
        tooltip.innerHTML = CardUtils.getCardHoverHTML(card);
        tooltip.style.display = 'block';
        updateTooltipPosition(x, y);
    }

    /**
     * Update tooltip position
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    function updateTooltipPosition(x, y) {
        const tooltip = getHoverTooltip();
        if (tooltip.style.display !== 'block') return;

        const offset = 12;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Get tooltip dimensions (force reflow if needed)
        const tooltipRect = tooltip.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width || 320; // fallback to maxWidth
        const tooltipHeight = tooltipRect.height || 200; // rough estimate

        // Determine horizontal position
        let left;
        if (x > viewportWidth / 2) {
            // Mouse in right half - show tooltip to the left
            left = x - tooltipWidth - offset;
        } else {
            // Mouse in left half - show tooltip to the right
            left = x + offset;
        }

        // Determine vertical position
        let top;
        if (y > viewportHeight / 2) {
            // Mouse in lower half - show tooltip above
            top = y - tooltipHeight - offset;
        } else {
            // Mouse in upper half - show tooltip below
            top = y + offset;
        }

        // Ensure tooltip stays within viewport bounds
        left = Math.max(5, Math.min(left, viewportWidth - tooltipWidth - 5));
        top = Math.max(5, Math.min(top, viewportHeight - tooltipHeight - 5));

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    /**
     * Hide card hover tooltip
     */
    function hideCardTooltip() {
        const tooltip = getHoverTooltip();
        tooltip.style.display = 'none';
    }

    /**
     * Create a card display element
     * @param {Object} card - Card data
     * @param {Object} options - Display options
     * @returns {HTMLElement} Card element
     */
    function createCardElement(card, options = {}) {
        const {
            onClick = null,
            onDragStart = null,
            draggable = false,
            showActions = true,
            actions = []
        } = options;

        const div = document.createElement('div');
        div.className = 'card ' + (options.className || '');
        div.draggable = draggable;
        div.setAttribute('data-card-id', card.id);

        if (onDragStart) {
            div.addEventListener('dragstart', (e) => onDragStart(e, card));
        }

        const imageUrl = CardUtils.getCardImageUrl(card);
        div.innerHTML = `
            <img src="${imageUrl}" alt="${card.name}" 
                onerror="this.src='https://via.placeholder.com/40x58?text=?'"
                ${onClick ? 'style="cursor: pointer;"' : ''}>
            <div style="flex: 1;">
                <strong>${card.name}</strong><br>
                <small>${card.type || 'Unknown'} • ${card.archetype || 'No archetype'}</small><br>
                <small style="color: #aaa;">ID: ${card.id}</small>
            </div>
        `;

        if (onClick) {
            div.addEventListener('click', () => onClick(card));
        }

        return div;
    }

    /**
     * Paginate array
     * @param {Array} items - Items to paginate
     * @param {number} page - Current page (0-indexed)
     * @param {number} pageSize - Items per page
     * @returns {Object} Pagination info
     */
    function getPaginationInfo(items, page, pageSize) {
        const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
        const currentPage = Math.min(page, totalPages - 1);
        const startIndex = currentPage * pageSize;
        const endIndex = Math.min(startIndex + pageSize, items.length);
        const pageItems = items.slice(startIndex, endIndex);

        return {
            items: pageItems,
            currentPage,
            totalPages,
            hasNextPage: currentPage < totalPages - 1,
            hasPreviousPage: currentPage > 0,
            startIndex,
            endIndex,
            totalItems: items.length
        };
    }

    /**
     * Create pagination controls HTML
     * @param {Object} paginationInfo - Pagination info
     * @param {Function} onPageChange - Page change callback
     * @returns {HTMLElement} Pagination element
     */
    function createPaginationControls(paginationInfo, onPageChange) {
        const { currentPage, totalPages, hasPreviousPage, hasNextPage } = paginationInfo;

        const div = document.createElement('div');
        div.className = 'pagination-bar';

        const btnFirst = document.createElement('button');
        btnFirst.textContent = '<<';
        btnFirst.disabled = !hasPreviousPage;
        btnFirst.onclick = () => onPageChange(0);

        const btnPrev = document.createElement('button');
        btnPrev.textContent = '<';
        btnPrev.disabled = !hasPreviousPage;
        btnPrev.onclick = () => onPageChange(currentPage - 1);

        const info = document.createElement('span');
        info.textContent = `${currentPage + 1}/${totalPages}`;
        info.style.margin = '0 10px';

        const btnNext = document.createElement('button');
        btnNext.textContent = '>';
        btnNext.disabled = !hasNextPage;
        btnNext.onclick = () => onPageChange(currentPage + 1);

        const btnLast = document.createElement('button');
        btnLast.textContent = '>>';
        btnLast.disabled = !hasNextPage;
        btnLast.onclick = () => onPageChange(totalPages - 1);

        div.appendChild(btnFirst);
        div.appendChild(btnPrev);
        div.appendChild(info);
        div.appendChild(btnNext);
        div.appendChild(btnLast);

        return div;
    }

    /**
     * Show modal dialog
     * @param {string} title - Modal title
     * @param {string} content - Modal content (HTML)
     * @param {Object} options - Modal options
     */
    function showModal(title, content, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
        modal.style.zIndex = '1000';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.backgroundColor = '#1a1a1a';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '8px';
        modalContent.style.maxWidth = '600px';
        modalContent.style.maxHeight = '80vh';
        modalContent.style.overflow = 'auto';

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h2>${title}</h2>
                <button style="background: none; border: none; color: #ddd; cursor: pointer; font-size: 24px;" onclick="this.closest('.modal').remove();">&times;</button>
            </div>
            <div>${content}</div>
        `;

        modal.appendChild(modalContent);
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Clear element content
     * @param {HTMLElement} element - Element to clear
     */
    function clearElement(element) {
        if (element) {
            element.innerHTML = '';
        }
    }

    /**
     * Set element visibility
     * @param {HTMLElement|string} element - Element or selector
     * @param {boolean} visible - Visibility state
     */
    function setVisible(element, visible) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.style.display = visible ? 'block' : 'none';
        }
    }

    return {
        getHoverTooltip,
        showCardTooltip,
        updateTooltipPosition,
        hideCardTooltip,
        createCardElement,
        getPaginationInfo,
        createPaginationControls,
        showModal,
        clearElement,
        setVisible
    };
})();
