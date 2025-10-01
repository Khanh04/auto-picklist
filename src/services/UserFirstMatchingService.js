const MatchingService = require('./MatchingService');
const ItemPreferenceRepository = require('../repositories/ItemPreferenceRepository');
const ProductRepository = require('../repositories/ProductRepository');
const SupplierRepository = require('../repositories/SupplierRepository');

/**
 * Enhanced matching service that always prioritizes user preferences
 * Moves all supplier selection logic to the backend
 */
class UserFirstMatchingService extends MatchingService {
    constructor(userId = null) {
        super(userId);
        this.itemPreferenceRepository = new ItemPreferenceRepository(userId);
        this.productRepository = new ProductRepository(userId);
        this.supplierRepository = new SupplierRepository(userId);
        this.userId = userId;
    }

    /**
     * Set user context for all repositories
     * @param {number} userId - User ID
     */
    setUserContext(userId) {
        this.userId = userId;
        super.setUserContext(userId);
        this.itemPreferenceRepository.setUserContext(userId);
        this.productRepository.setUserContext(userId);
        this.supplierRepository.setUserContext(userId);
    }

    /**
     * Generate complete picklist with backend supplier selection
     * @param {Array} orderItems - Array of {item, quantity}
     * @returns {Promise<Array>} Complete picklist with suppliers selected
     */
    async createIntelligentPicklist(orderItems) {
        console.log(`🎯 Processing ${orderItems.length} items with user-first supplier selection`);
        const picklist = [];

        for (const orderItem of orderItems) {
            const picklistItem = await this.processOrderItem(orderItem);
            picklist.push(picklistItem);
        }

        console.log(`✅ Completed picklist generation with ${picklist.length} items`);
        return picklist;
    }

    /**
     * Process single order item with intelligent supplier selection
     * @private
     */
    async processOrderItem(orderItem) {
        const { item: originalItem, quantity } = orderItem;

        try {
            // Step 1: Check for unified preference first (single lookup)
            const unifiedPreference = await this.itemPreferenceRepository.getPreference(originalItem);

            let productMatch, supplierDecision;

            if (unifiedPreference) {
                // We have a complete preference: item -> {product_id, supplier_id}
                console.log(`🎯 Found unified preference for "${originalItem}": product ${unifiedPreference.product_id}, supplier ${unifiedPreference.supplier_name}`);

                productMatch = {
                    productId: unifiedPreference.product_id,
                    description: unifiedPreference.product_description,
                    isPreference: true
                };

                // Get price information for this specific product-supplier combination
                const priceInfo = await this.getSupplierDetails(unifiedPreference.supplier_id, unifiedPreference.product_id);

                supplierDecision = {
                    supplier: {
                        id: unifiedPreference.supplier_id,
                        name: unifiedPreference.supplier_name
                    },
                    price: priceInfo?.price || null,
                    reason: `User preference (used ${unifiedPreference.frequency} times)`,
                    isUserPreferred: true,
                    alternatives: await this.getAlternativeSuppliers(unifiedPreference.product_id, unifiedPreference.supplier_id),
                    preferenceStrength: this.itemPreferenceRepository.calculatePreferenceStrength(unifiedPreference)
                };

            } else {
                // No unified preference - fall back to traditional matching + supplier selection
                console.log(`🔍 No unified preference for "${originalItem}", using traditional matching`);

                productMatch = await this.matchWithPreferences(originalItem);
                supplierDecision = await this.selectSupplierUserFirst(originalItem, productMatch.productId);
            }

            // Step 3: Build complete picklist item
            return {
                quantity,
                item: originalItem,
                originalItem,
                selectedSupplier: supplierDecision.supplier.name,
                unitPrice: supplierDecision.price || 'No price found',
                totalPrice: supplierDecision.price ?
                    (supplierDecision.price * quantity).toFixed(2) : 'N/A',
                matchedItemId: productMatch.productId,
                matchedDescription: productMatch.description,
                manualOverride: false,
                isPreference: productMatch.isPreference || false,
                // Enhanced metadata for frontend
                supplierDecision: {
                    supplierId: supplierDecision.supplier.id,
                    selectionReason: supplierDecision.reason,
                    isUserPreferred: supplierDecision.isUserPreferred,
                    alternatives: supplierDecision.alternatives || [],
                    confidence: supplierDecision.isUserPreferred ? 'high' : 'medium',
                    preferenceStrength: supplierDecision.preferenceStrength || 0
                }
            };

        } catch (error) {
            console.error(`Error processing item "${originalItem}":`, error.message);

            // Fallback item for errors
            return {
                quantity,
                item: originalItem,
                originalItem,
                selectedSupplier: 'back order',
                unitPrice: 'Error',
                totalPrice: 'N/A',
                matchedItemId: null,
                matchedDescription: null,
                manualOverride: false,
                supplierDecision: {
                    supplierId: null,
                    selectionReason: `Error: ${error.message}`,
                    isUserPreferred: false,
                    alternatives: [],
                    confidence: 'low',
                    preferenceStrength: 0
                }
            };
        }
    }

    /**
     * User-first supplier selection logic
     * Simplified - only used as fallback when no unified preference exists
     * @param {string} originalItem - Original item name
     * @param {number} productId - Matched product ID
     * @returns {Promise<Object>} Supplier decision with reasoning
     */
    async selectSupplierUserFirst(originalItem, productId) {
        // This method is now only used as fallback when no unified preference exists
        // The unified preference system handles both product matching AND supplier selection

        console.log(`🤖 No unified preference for "${originalItem}", using system optimization for product ${productId}`);

        if (productId) {
            // Get all suppliers for the specific matched product
            const productSuppliers = await this.productRepository.getSuppliersByProductId(productId);

            if (productSuppliers.length > 0) {
                // Select the cheapest supplier for this specific product
                const bestSupplier = productSuppliers[0]; // Already sorted by price ASC

                return {
                    supplier: {
                        id: bestSupplier.supplier_id,
                        name: bestSupplier.supplier_name
                    },
                    price: bestSupplier.price,
                    reason: `Best price for matched product (${productSuppliers.length} suppliers available)`,
                    isUserPreferred: false,
                    alternatives: await this.getAlternativeSuppliers(productId, bestSupplier.supplier_id),
                    preferenceStrength: 0
                };
            }
        }

        // Fallback to "back order"
        console.log(`⚠️  No suppliers available for "${originalItem}"`);
        return {
            supplier: { id: null, name: 'back order' },
            price: null,
            reason: 'No suppliers available',
            isUserPreferred: false,
            alternatives: [],
            preferenceStrength: 0
        };
    }

    /**
     * Get supplier details with pricing for a specific product
     * @private
     */
    async getSupplierDetails(supplierId, productId) {
        if (!supplierId || !productId) {
            console.warn(`⚠️  Invalid parameters for getSupplierDetails: supplierId=${supplierId}, productId=${productId}`);
            return null;
        }

        try {
            const suppliers = await this.productRepository.getSuppliersByProductId(productId);
            console.log(`🔍 Found ${suppliers.length} suppliers for product ${productId}, looking for supplier ${supplierId}`);
            const found = suppliers.find(s => s.supplier_id === supplierId);
            if (!found) {
                console.warn(`⚠️  Supplier ${supplierId} not found among available suppliers: ${suppliers.map(s => `${s.supplier_id}:${s.supplier_name}`).join(', ')}`);
            }
            return found || null;
        } catch (error) {
            console.error('Error getting supplier details:', error.message);
            return null;
        }
    }

    /**
     * Get supplier by name
     * @private
     */
    async getSupplierByName(supplierName) {
        try {
            return await this.supplierRepository.findByName(supplierName);
        } catch (error) {
            console.error('Error getting supplier by name:', error.message);
            return null;
        }
    }

    /**
     * Get alternative suppliers for transparency
     * @private
     */
    async getAlternativeSuppliers(productId, excludeSupplierId = null) {
        if (!productId) return [];

        try {
            const allSuppliers = await this.productRepository.getSuppliersByProductId(productId);

            let alternatives = allSuppliers;
            if (excludeSupplierId) {
                alternatives = allSuppliers.filter(s => s.supplier_id !== excludeSupplierId);
            }

            // Sort by price and limit to top 3
            return alternatives
                .sort((a, b) => a.price - b.price)
                .slice(0, 3)
                .map(supplier => ({
                    id: supplier.supplier_id,
                    name: supplier.supplier_name,
                    price: supplier.price,
                    savings: null // Will be calculated relative to selected supplier
                }));

        } catch (error) {
            console.error('Error getting alternative suppliers:', error.message);
            return [];
        }
    }

    /**
     * Update supplier selection and learn from user changes
     * @param {string} originalItem - Original item name
     * @param {number} newSupplierId - New supplier ID
     * @param {number} matchedProductId - Required matched product ID
     * @returns {Promise<Object>} Updated details
     */
    async updateSupplierSelection(originalItem, newSupplierId, matchedProductId) {
        try {
            if (!matchedProductId) {
                throw new Error('Product ID is required for unified preference system');
            }

            // Store the unified preference (item -> product_id + supplier_id)
            const savedPreference = await this.itemPreferenceRepository.upsert(
                originalItem,
                matchedProductId,
                newSupplierId
            );

            // Get updated supplier details
            const supplierDetails = await this.getSupplierDetails(newSupplierId, matchedProductId);
            const supplier = await this.supplierRepository.getById(newSupplierId);

            console.log(`📝 Learned unified preference: "${originalItem}" → product ${matchedProductId}, supplier "${supplier?.name}" (frequency: ${savedPreference.frequency})`);

            return {
                originalItem,
                newSupplier: supplier?.name || 'Unknown Supplier',
                newPrice: supplierDetails?.price || 'Not available',
                reason: 'User manual selection - unified preference learned',
                preferenceUpdated: true,
                frequency: savedPreference.frequency,
                productId: matchedProductId,
                supplierId: newSupplierId
            };

        } catch (error) {
            console.error('Error updating supplier selection:', error.message);
            throw error;
        }
    }

    /**
     * Get preferences summary for multiple items
     * @param {Array} items - Array of item names
     * @returns {Promise<Object>} Summary of preferences
     */
    async getPreferencesSummary(items) {
        const summary = {
            totalItems: items.length,
            itemsWithPreferences: 0,
            preferenceDetails: []
        };

        // Use the new unified item preferences
        const preferences = await this.itemPreferenceRepository.getPreferencesForItems(items);

        for (const item of items) {
            const preference = preferences.get(item.toLowerCase());
            if (preference) {
                summary.itemsWithPreferences++;
                summary.preferenceDetails.push({
                    item,
                    product: preference.product_description,
                    supplier: preference.supplier_name,
                    frequency: preference.frequency,
                    lastUsed: preference.last_used,
                    productId: preference.product_id,
                    supplierId: preference.supplier_id
                });
            }
        }

        summary.preferencePercentage = ((summary.itemsWithPreferences / summary.totalItems) * 100).toFixed(1);

        return summary;
    }
}

module.exports = UserFirstMatchingService;