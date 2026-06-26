/**
 * Card Modal UI Module - Displays card details in modal
 */

const CardModalUI = (() => {
    let currentCard = null;

    /**
     * Show card details modal
     * @param {number} cardId - Card ID
     */
    async function show(cardId) {
        const modal = document.getElementById('cardModal');
        if (!modal) return;

        const content = document.getElementById('modalCardContent');
        if (!content) return;

        try {
            const card = await CardAPI.fetchCardById(cardId);
            if (!card) {
                content.innerHTML = '<p>Card not found.</p>';
                modal.style.display = 'block';
                return;
            }

            currentCard = card;
            renderCardDetails(content, card);
            modal.style.display = 'block';
        } catch (e) {
            content.innerHTML = '<p>Error loading card details.</p>';
            modal.style.display = 'block';
            console.error('Card modal error:', e);
        }
    }

    /**
     * Close modal
     */
    function close() {
        const modal = document.getElementById('cardModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Render card details in modal
     * @param {HTMLElement} container - Content container
     * @param {Object} card - Card data
     */
    function renderCardDetails(container, card) {
        const inCollection = CollectionManager.getQuantity(card.id);
        const inDeck = DeckManager.getAllCards().filter(id => id === card.id).length;

        const imageUrl = CardUtils.getCardImageUrl(card);
        const cardType = card.type || 'Unknown';
        const archetype = card.archetype || 'None';

        container.innerHTML = `
            <div class="card-detail">
                <div class="card-controls">
                    <img src="${imageUrl}" alt="${card.name}" style="max-width: 200px; margin-bottom: 10px;">
                    
                    <div class="control-group" style="margin-bottom: 15px;">
                        <label><strong>Collection:</strong></label>
                        <div class="quantity-controls" style="display: flex; gap: 5px; align-items: center;">
                            <button onclick="CardModalUI.adjustCollection(${card.id}, -1)">-</button>
                            <input type="number" id="collectionQty" value="${inCollection}" min="0" onchange="CardModalUI.setCollectionQuantity(${card.id}, this.value)">
                            <button onclick="CardModalUI.adjustCollection(${card.id}, 1)">+</button>
                        </div>
                    </div>

                    <div class="control-group">
                        <label><strong>Deck:</strong></label>
                        <div style="display: flex; gap: 5px;">
                            <button onclick="DeckManager.addCard(${card.id}); CardModalUI.show(${card.id});" style="flex: 1;">Add to Deck</button>
                        </div>
                        <small style="color: #aaa;">In deck: ${inDeck}</small>
                    </div>
                </div>

                <div class="card-info">
                    <h2>${card.name}</h2>
                    <p><strong>Type:</strong> ${cardType}</p>
                    <p><strong>Archetype:</strong> ${archetype}</p>
                    <p><strong>ID:</strong> ${card.id}</p>
                    ${card.level ? `<p><strong>Level:</strong> ${card.level}</p>` : ''}
                    ${card.attribute ? `<p><strong>Attribute:</strong> ${card.attribute}</p>` : ''}
                    ${card.race ? `<p><strong>Race:</strong> ${card.race}</p>` : ''}
                    ${card.atk !== undefined ? `<p><strong>ATK:</strong> ${card.atk}</p>` : ''}
                    ${card.def !== undefined ? `<p><strong>DEF:</strong> ${card.def}</p>` : ''}
                    ${card.desc ? `<p><strong>Effect:</strong></p><p style="line-height: 1.6; color: #ddd;">${card.desc}</p>` : ''}
                </div>

            </div>
        `;
    }

    /**
     * Adjust collection quantity from modal
     * @param {number} cardId - Card ID
     * @param {number} delta - Change amount
     */
    function adjustCollection(cardId, delta) {
        CollectionManager.adjust(cardId, delta);
        if (currentCard && currentCard.id === cardId) {
            show(cardId);
        }
        CollectionUI.updateStats();
        SearchUI.updateCollectionCount();
    }

    /**
     * Set collection quantity from modal
     * @param {number} cardId - Card ID
     * @param {number} quantity - New quantity
     */
    function setCollectionQuantity(cardId, quantity) {
        CollectionManager.setQuantity(cardId, parseInt(quantity) || 0);
        if (currentCard && currentCard.id === cardId) {
            show(cardId);
        }
        CollectionUI.updateStats();
        SearchUI.updateCollectionCount();
    }

    return {
        show,
        close,
        renderCardDetails,
        adjustCollection,
        setCollectionQuantity
    };
})();
