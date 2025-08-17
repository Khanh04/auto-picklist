const express = require('express');
const router = express.Router();

const SupplierRepository = require('../repositories/SupplierRepository');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateBody, validateParams } = require('../middleware/validation');

const supplierRepository = new SupplierRepository();

/**
 * GET /api/suppliers
 * Get all suppliers with product counts
 */
router.get('/', asyncHandler(async (req, res) => {
    const suppliers = await supplierRepository.getAllWithProductCounts();
    
    res.json({
        success: true,
        suppliers
    });
}));

/**
 * POST /api/suppliers
 * Create a new supplier
 */
router.post('/',
    validateBody({
        name: { required: true, type: 'string', minLength: 2, maxLength: 100 }
    }),
    asyncHandler(async (req, res) => {
        const { name } = req.body;

        // Check if supplier already exists
        const existingSupplier = await supplierRepository.findByName(name);
        if (existingSupplier) {
            return res.status(409).json({
                success: false,
                error: 'Supplier already exists'
            });
        }

        const supplier = await supplierRepository.create(name);

        res.status(201).json({
            success: true,
            message: `Supplier "${name}" created successfully`,
            supplier
        });
    })
);

/**
 * GET /api/suppliers/:supplierId
 * Get supplier details by ID
 */
router.get('/:supplierId',
    validateParams({ supplierId: { type: 'id' } }),
    asyncHandler(async (req, res) => {
        const { supplierId } = req.params;
        
        const supplier = await supplierRepository.getById(supplierId);
        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Supplier not found'
            });
        }

        res.json({
            success: true,
            supplier
        });
    })
);

/**
 * GET /api/suppliers/:supplierId/items
 * Get all items for a specific supplier
 */
router.get('/:supplierId/items',
    validateParams({ supplierId: { type: 'id' } }),
    asyncHandler(async (req, res) => {
        const { supplierId } = req.params;
        
        // Verify supplier exists
        const supplier = await supplierRepository.getById(supplierId);
        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Supplier not found'
            });
        }

        const items = await supplierRepository.getItemsBySupplierId(supplierId);
        
        res.json({
            success: true,
            items,
            supplier: supplier.name
        });
    })
);

/**
 * PUT /api/suppliers/:supplierId/items/:supplierPriceId
 * Update price for a supplier's item
 */
router.put('/:supplierId/items/:supplierPriceId',
    validateParams({ 
        supplierId: { type: 'id' },
        supplierPriceId: { type: 'id' }
    }),
    validateBody({
        price: { required: true, type: 'number', min: 0 }
    }),
    asyncHandler(async (req, res) => {
        const { supplierPriceId } = req.params;
        const { price } = req.body;

        const updatedPrice = await supplierRepository.updatePrice(supplierPriceId, price);
        
        if (!updatedPrice) {
            return res.status(404).json({
                success: false,
                error: 'Supplier price record not found'
            });
        }

        res.json({
            success: true,
            message: 'Price updated successfully',
            supplierPrice: updatedPrice
        });
    })
);

/**
 * DELETE /api/suppliers/:supplierId/items/:supplierPriceId
 * Remove an item from a supplier
 */
router.delete('/:supplierId/items/:supplierPriceId',
    validateParams({ 
        supplierId: { type: 'id' },
        supplierPriceId: { type: 'id' }
    }),
    asyncHandler(async (req, res) => {
        const { supplierPriceId } = req.params;

        const deleted = await supplierRepository.removeProduct(supplierPriceId);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Supplier price record not found'
            });
        }

        res.json({
            success: true,
            message: 'Item removed from supplier successfully'
        });
    })
);

module.exports = router;