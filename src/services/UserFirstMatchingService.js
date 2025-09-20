const MatchingService = require('./MatchingService');
const SupplierPreferenceRepository = require('../repositories/SupplierPreferenceRepository');
const ProductRepository = require('../repositories/ProductRepository');
const SupplierRepository = require('../repositories/SupplierRepository');

/**
 * Enhanced matching service that always prioritizes user preferences
 * Moves all supplier selection logic to the backend
 */
class UserFirstMatchingService extends MatchingService {
    constructor() {
        super();
        this.supplierPreferenceRepository = new SupplierPreferenceRepository();
        this.productRepository = new ProductRepository();
        this.supplierRepository = new SupplierRepository();
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
            // Step 1: Find product match
            const productMatch = await this.matchWithPreferences(originalItem);

            // Step 2: Select supplier using user-first logic
            const supplierDecision = await this.selectSupplierUserFirst(
                originalItem,
                productMatch.productId
            );

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
     * Always prioritizes user preferences over system optimization
     * @param {string} originalItem - Original item name
     * @param {number} productId - Matched product ID
     * @returns {Promise<Object>} Supplier decision with reasoning
     */
    async selectSupplierUserFirst(originalItem, productId) {
        // Step 1: ALWAYS check for user preference first
        const userPreference = await this.supplierPreferenceRepository.getPreference(
            originalItem,
            productId
        );

        if (userPreference) {
            console.log(`👤 User preference found for "${originalItem}": ${userPreference.supplier_name} (${userPreference.frequency}x)`);

            // Get supplier details and pricing
            const preferredSupplierDetails = await this.getSupplierDetails(
                userPreference.preferred_supplier_id,
                productId
            );

            if (preferredSupplierDetails) {
                return {
                    supplier: {
                        id: userPreference.preferred_supplier_id,
                        name: userPreference.supplier_name
                    },
                    price: preferredSupplierDetails.price,
                    reason: `User preference (selected ${userPreference.frequency} times)`,
                    isUserPreferred: true,
                    alternatives: await this.getAlternativeSuppliers(productId, userPreference.preferred_supplier_id),
                    preferenceStrength: this.supplierPreferenceRepository.calculatePreferenceStrength(userPreference)
                };
            }
        }

        // Step 2: No user preference - use system optimization
        console.log(`🤖 No user preference for "${originalItem}", using system optimization`);
        const systemChoice = await this.findBestSupplier(originalItem);

        if (systemChoice.supplier && systemChoice.supplier !== 'back order') {
            const supplierDetails = await this.getSupplierByName(systemChoice.supplier);

            return {
                supplier: {
                    id: supplierDetails?.id || null,
                    name: systemChoice.supplier
                },
                price: systemChoice.price,
                reason: 'Best price available',
                isUserPreferred: false,
                alternatives: await this.getAlternativeSuppliers(productId),
                preferenceStrength: 0
            };
        }

        // Step 3: Fallback to "back order"
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
        if (!supplierId || !productId) return null;

        try {
            const suppliers = await this.productRepository.getSuppliersByProductId(productId);
            return suppliers.find(s => s.supplier_id === supplierId) || null;
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
     * @param {number} matchedProductId - Optional matched product ID
     * @returns {Promise<Object>} Updated details
     */
    async updateSupplierSelection(originalItem, newSupplierId, matchedProductId = null) {
        try {
            // Store the user's new preference
            const savedPreference = await this.supplierPreferenceRepository.upsert(
                originalItem,
                newSupplierId,
                matchedProductId
            );

            // Get updated supplier details
            const supplierDetails = await this.getSupplierDetails(newSupplierId, matchedProductId);
            const supplier = await this.supplierRepository.getById(newSupplierId);

            console.log(`📝 Learned preference: "${originalItem}" → "${supplier?.name}" (frequency: ${savedPreference.frequency})`);

            return {
                originalItem,
                newSupplier: supplier?.name || 'Unknown Supplier',
                newPrice: supplierDetails?.price || 'Not available',
                reason: 'User manual selection - preference learned',
                preferenceUpdated: true,
                frequency: savedPreference.frequency
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

        for (const item of items) {
            const preference = await this.supplierPreferenceRepository.getPreference(item);
            if (preference) {
                summary.itemsWithPreferences++;
                summary.preferenceDetails.push({
                    item,
                    supplier: preference.supplier_name,
                    frequency: preference.frequency,
                    lastUsed: preference.last_used
                });
            }
        }

        summary.preferencePercentage = ((summary.itemsWithPreferences / summary.totalItems) * 100).toFixed(1);

        return summary;
    }
}

module.exports = UserFirstMatchingService;