/**
 * Card Utilities Module - Common card-related functions
 * Handles sorting, filtering, normalization, and rendering helpers
 */

const CardUtils = (() => {
    /**
     * Normalize sort value for comparison
     * @param {*} value - Value to normalize
     * @returns {string|number} Normalized value
     */
    function normalizeSortValue(value) {
        if (value === undefined || value === null) return '';
        if (typeof value === 'string') return value.toLowerCase();
        return value;
    }

    /**
     * Parse range input (e.g., "1-10", "5", "")
     * @param {string} value - Range string
     * @returns {Object} { min, max }
     */
    function parseRangeInput(value) {
        if (!value || value.trim() === '') return { min: null, max: null };
        
        const trimmed = value.trim();
        if (trimmed.includes('-')) {
            const [min, max] = trimmed.split('-').map(s => s.trim()).map(Number);
            return { 
                min: isNaN(min) ? null : min, 
                max: isNaN(max) ? null : max 
            };
        } else {
            const exact = Number(trimmed);
            return { 
                min: isNaN(exact) ? null : exact, 
                max: isNaN(exact) ? null : exact 
            };
        }
    }

    /**
     * Check if value is in range
     * @param {number} value - Value to check
     * @param {number} min - Min value (null = no limit)
     * @param {number} max - Max value (null = no limit)
     * @returns {boolean} Is in range
     */
    function isInRange(value, min, max) {
        if (min !== null && value < min) return false;
        if (max !== null && value > max) return false;
        return true;
    }

    /**
     * Compare two values for sorting
     * @param {*} a - First value
     * @param {*} b - Second value
     * @param {string} order - 'asc' or 'desc'
     * @returns {number} Comparison result
     */
    function compareValues(a, b, order = 'asc') {
        if (typeof a === 'string' && typeof b === 'string') {
            const comparison = a.localeCompare(b);
            return order === 'asc' ? comparison : -comparison;
        }
        
        const diff = a - b;
        return order === 'asc' ? diff : -diff;
    }

    /**
     * Get card hover tooltip HTML
     * @param {Object} card - Card data
     * @returns {string} HTML string
     */
    function getCardHoverHTML(card) {
        if (!card) return '';

        const lines = [];
        lines.push(`<strong>${card.name}</strong>`);
        
        const typeLine = [card.type || 'Unknown'];
        if (card.archetype) typeLine.push(card.archetype);
        lines.push(`<small>${typeLine.join(' • ')}</small>`);
        
        lines.push(`<small>ID: ${card.id}</small>`);
        if (card.level) lines.push(`<small>Level: ${card.level}</small>`);
        if (card.attribute) lines.push(`<small>Attribute: ${card.attribute}</small>`);
        if (card.race) lines.push(`<small>Race: ${card.race}</small>`);
        if (card.atk !== undefined) lines.push(`<small>ATK: ${card.atk}</small>`);
        if (card.def !== undefined) lines.push(`<small>DEF: ${card.def}</small>`);
        
        if (card.desc) {
            const desc = card.desc.length > 180 ? card.desc.slice(0, 180) + '...' : card.desc;
            lines.push(`<p style="margin: 8px 0 0; color: #ccc; line-height: 1.4;">${desc}</p>`);
        }
        
        return lines.join('<br>');
    }

    /**
     * Get card image URL with fallback
     * @param {Object} card - Card data
     * @returns {string} Image URL
     */
    function getCardImageUrl(card) {
        if (!card) return 'https://via.placeholder.com/40x58?text=?';
        
        if (card.card_images && card.card_images.length > 0) {
            return card.card_images[0].image_url_small || 'https://via.placeholder.com/40x58?text=?';
        }
        
        return `https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`;
    }

    /**
     * Format card display info
     * @param {Object} card - Card data
     * @returns {string} Formatted info
     */
    function formatCardInfo(card) {
        if (!card) return 'Unknown Card';

        const parts = [card.name];
        
        if (card.type) {
            parts.push(`Type: ${card.type}`);
        }
        
        if (card.archetype) {
            parts.push(`Archetype: ${card.archetype}`);
        }
        
        return parts.join(' • ');
    }

    /**
     * Sort cards by property
     * @param {Array} cards - Card array
     * @param {string} property - Property to sort by
     * @param {string} order - 'asc' or 'desc'
     * @returns {Array} Sorted cards
     */
    function sortCards(cards, property = 'name', order = 'asc') {
        return [...cards].sort((a, b) => {
            let aVal, bVal;

            switch (property) {
                case 'name':
                    aVal = normalizeSortValue(a.name);
                    bVal = normalizeSortValue(b.name);
                    break;
                case 'type':
                    aVal = normalizeSortValue(a.type);
                    bVal = normalizeSortValue(b.type);
                    break;
                case 'attribute':
                    aVal = normalizeSortValue(a.attribute);
                    bVal = normalizeSortValue(b.attribute);
                    break;
                case 'race':
                    aVal = normalizeSortValue(a.race);
                    bVal = normalizeSortValue(b.race);
                    break;
                case 'level':
                    aVal = a.level || 0;
                    bVal = b.level || 0;
                    break;
                case 'atk':
                    aVal = Number.isFinite(a.atk) ? a.atk : -9999;
                    bVal = Number.isFinite(b.atk) ? b.atk : -9999;
                    break;
                case 'def':
                    aVal = Number.isFinite(a.def) ? a.def : -9999;
                    bVal = Number.isFinite(b.def) ? b.def : -9999;
                    break;
                default:
                    return 0;
            }

            return compareValues(aVal, bVal, order);
        });
    }

    return {
        normalizeSortValue,
        parseRangeInput,
        isInRange,
        compareValues,
        getCardHoverHTML,
        getCardImageUrl,
        formatCardInfo,
        sortCards
    };
})();
