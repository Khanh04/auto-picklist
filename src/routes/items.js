const express = require('express');
const router = express.Router();

const ProductRepository = require('../repositories/ProductRepository');
const SupplierRepository = require('../repositories/SupplierRepository');
const MatchingService = require('../services/MatchingService');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateBody, validateParams } = require('../middleware/validation');
const { enhancedAsyncHandler, createValidationError, createNotFoundError } = require('../middleware/enhancedErrorHandler');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/errorResponse');
const { ERROR_TYPES } = require('../utils/errorTypes');

const productRepository = new ProductRepository();
const supplierRepository = new SupplierRepository();
const matchingService = new MatchingService();

/**
 * GET /api/items
 * Get all items with best prices
 */
router.get('/', enhancedAsyncHandler(async (req, res) => {
    const items = await productRepository.getAllWithBestPrices();
    
    sendSuccessResponse(req, res, { items }, {
        count: items.length,
        message: 'Items retrieved successfully'
    });
}));

/**
 * POST /api/items
 * Add a new item with supplier and price
 */
router.post('/', 
    validateBody({
        description: { required: true, type: 'string', minLength: 3, maxLength: 500 },
        supplier: { required: true, type: 'string', minLength: 2, maxLength: 100 },
        price: { required: true, type: 'number', min: 0 }
    }),
    asyncHandler(async (req, res) => {
        const { description, supplier, price } = req.body;

        // Find or create supplier
        let supplierRecord = await supplierRepository.findByName(supplier);
        if (!supplierRecord) {
            supplierRecord = await supplierRepository.create(supplier);
        }

        // Find or create product
        let product = await productRepository.findByDescription(description);
        if (!product) {
            product = await productRepository.create(description);
        }

        // Add supplier price
        await supplierRepository.addProduct(product.id, supplierRecord.id, price);

        res.status(201).json({
            success: true,
            message: `Item "${description}" added to ${supplier} successfully`,
            product: {
                id: product.id,
                description: product.description,
                supplier: supplier,
                price: price
            }
        });
    })
);

/**
 * GET /api/items/:productId/suppliers
 * Get all suppliers for a specific product for supplier switching
 */
router.get('/:productId/suppliers',
    validateParams({ productId: { type: 'id' } }),
    asyncHandler(async (req, res) => {
        const { productId } = req.params;

        const suppliers = await productRepository.getSuppliersByProductId(productId);

        if (!suppliers || suppliers.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No suppliers available for this product'
            });
        }

        // Format suppliers for frontend consumption
        const formattedSuppliers = suppliers.map(supplier => ({
            name: supplier.supplier_name,
            price: parseFloat(supplier.price),
            inStock: true // Default to true since we don't track stock status
        }));

        res.json({
            success: true,
            data: {
                availableSuppliers: formattedSuppliers
            }
        });
    })
);

/**
 * POST /api/items/match
 * Match an item description to database products
 */
router.post('/match',
    validateBody({
        description: { required: true, type: 'string', minLength: 2, maxLength: 500 }
    }),
    enhancedAsyncHandler(async (req, res) => {
        const { description } = req.body;
        
        if (!description?.trim()) {
            throw createValidationError(['description'], 'Description cannot be empty');
        }
        
        const result = await matchingService.findBestSupplier(description.trim());
        
        if (result.supplier && result.price) {
            sendSuccessResponse(req, res, {
                match: {
                    supplier: result.supplier,
                    price: result.price,
                    productId: result.productId,
                    description: result.description
                }
            });
        } else {
            res.json({
                success: false,
                message: 'No matching item found'
            });
        }
    })
);

/**
 * GET /api/items/search
 * Search products by description
 */
router.get('/search',
    asyncHandler(async (req, res) => {
        const { q: query, limit = 10 } = req.query;
        
        if (!query || query.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters'
            });
        }

        const products = await productRepository.search(query, parseInt(limit));
        
        res.json({
            success: true,
            products,
            query
        });
    })
);

/**
 * POST /api/items/:productId/switch-supplier
 * Switch to next lowest price supplier for a product
 */
router.post('/:productId/switch-supplier',
    validateParams({ productId: { type: 'id' } }),
    validateBody({
        currentSupplier: { required: true, type: 'string' },
        currentPrice: { required: true, type: 'number', min: 0 }
    }),
    asyncHandler(async (req, res) => {
        const { productId } = req.params;
        const { currentSupplier, currentPrice } = req.body;
        
        // Get all suppliers for this product, sorted by price
        const suppliers = await productRepository.getSuppliersByProductId(productId);
        
        if (!suppliers || suppliers.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No suppliers available for this product'
            });
        }

        // If there's only one supplier, offer manual selection with "back order" option
        if (suppliers.length === 1) {
            return res.json({
                success: false,
                error: 'Only one supplier available for this product',
                requiresManualSelection: true,
                availableSuppliers: suppliers.map(s => ({
                    name: s.supplier_name,
                    price: parseFloat(s.price),
                    isCurrent: s.supplier_name === currentSupplier && parseFloat(s.price) === parseFloat(currentPrice)
                })),
                currentSupplier: {
                    name: currentSupplier,
                    price: currentPrice
                }
            });
        }
        
        // Find current supplier index
        const currentIndex = suppliers.findIndex(s => 
            s.supplier_name === currentSupplier && 
            parseFloat(s.price) === parseFloat(currentPrice)
        );
        
        if (currentIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Current supplier not found for this product'
            });
        }
        
        // Get next supplier (next higher price)
        const nextIndex = currentIndex + 1;
        if (nextIndex >= suppliers.length) {
            // No automatic next supplier, return all suppliers for manual selection
            return res.json({
                success: false,
                error: 'No suppliers with higher prices available',
                requiresManualSelection: true,
                availableSuppliers: suppliers.map(s => ({
                    name: s.supplier_name,
                    price: parseFloat(s.price),
                    isCurrent: s.supplier_name === currentSupplier && parseFloat(s.price) === parseFloat(currentPrice)
                })),
                currentSupplier: {
                    name: currentSupplier,
                    price: currentPrice
                }
            });
        }
        
        const nextSupplier = suppliers[nextIndex];
        
        res.json({
            success: true,
            message: 'Successfully switched to next lowest price supplier',
            supplier: {
                name: nextSupplier.supplier_name,
                price: parseFloat(nextSupplier.price),
                productId: productId
            },
            previousSupplier: {
                name: currentSupplier,
                price: currentPrice
            }
        });
    })
);

/**
 * POST /api/items/:productId/select-supplier
 * Manually select a specific supplier for a product
 */
router.post('/:productId/select-supplier',
    validateParams({ productId: { type: 'id' } }),
    validateBody({
        selectedSupplier: { required: true, type: 'string' },
        selectedPrice: { required: true, type: 'number', min: 0 }
    }),
    asyncHandler(async (req, res) => {
        const { productId } = req.params;
        const { selectedSupplier, selectedPrice } = req.body;
        
        // Get all suppliers for this product to validate the selection
        const suppliers = await productRepository.getSuppliersByProductId(productId);
        
        if (!suppliers || suppliers.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No suppliers available for this product'
            });
        }
        
        // Validate that the selected supplier exists for this product
        const validSupplier = suppliers.find(s => 
            s.supplier_name === selectedSupplier && 
            parseFloat(s.price) === parseFloat(selectedPrice)
        );
        
        if (!validSupplier) {
            return res.status(400).json({
                success: false,
                error: 'Selected supplier not found for this product'
            });
        }
        
        res.json({
            success: true,
            message: 'Successfully selected supplier',
            supplier: {
                name: validSupplier.supplier_name,
                price: parseFloat(validSupplier.price),
                productId: productId
            }
        });
    })
);

module.exports = router;