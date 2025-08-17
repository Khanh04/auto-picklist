const express = require('express');
const router = express.Router();

const ProductRepository = require('../repositories/ProductRepository');
const SupplierRepository = require('../repositories/SupplierRepository');
const MatchingService = require('../services/MatchingService');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateBody, validateParams } = require('../middleware/validation');

const productRepository = new ProductRepository();
const supplierRepository = new SupplierRepository();
const matchingService = new MatchingService();

/**
 * GET /api/items
 * Get all items with best prices
 */
router.get('/', asyncHandler(async (req, res) => {
    const items = await productRepository.getAllWithBestPrices();
    
    res.json({
        success: true,
        items
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
 * Get all suppliers for a specific product
 */
router.get('/:productId/suppliers',
    validateParams({ productId: { type: 'id' } }),
    asyncHandler(async (req, res) => {
        const { productId } = req.params;
        
        const suppliers = await productRepository.getSuppliersByProductId(productId);
        
        res.json({
            success: true,
            suppliers
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
    asyncHandler(async (req, res) => {
        const { description } = req.body;
        
        const result = await matchingService.findBestSupplier(description.trim());
        
        if (result.supplier && result.price) {
            res.json({
                success: true,
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

module.exports = router;