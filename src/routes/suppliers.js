const express = require('express');
const router = express.Router();

const SupplierRepository = require('../repositories/SupplierRepository');
const { enhancedAsyncHandler, createValidationError, createNotFoundError } = require('../middleware/enhancedErrorHandler');
const { sendSuccessResponse } = require('../utils/errorResponse');
const { validateBody, validateParams } = require('../middleware/validation');

const supplierRepository = new SupplierRepository();

/**
 * GET /api/suppliers
 * Get all suppliers with product counts
 */
router.get('/', enhancedAsyncHandler(async (req, res) => {
    const suppliers = await supplierRepository.getAllWithProductCounts(req.user.id);

    sendSuccessResponse(req, res, { suppliers }, {
        count: suppliers.length,
        message: 'Suppliers retrieved successfully'
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
    enhancedAsyncHandler(async (req, res) => {
        const { name } = req.body;

        // Set user context for repository
        supplierRepository.setUserContext(req.user.id);

        // Check if supplier already exists
        const existingSupplier = await supplierRepository.findByName(name);
        if (existingSupplier) {
            throw createValidationError(['name'], `Supplier "${name}" already exists`);
        }

        const supplier = await supplierRepository.create(name);

        sendSuccessResponse(req, res, { supplier }, {
            message: `Supplier "${name}" created successfully`
        }, 201);
    })
);

/**
 * GET /api/suppliers/:supplierId
 * Get supplier details by ID
 */
router.get('/:supplierId',
    validateParams({ supplierId: { type: 'id' } }),
    enhancedAsyncHandler(async (req, res) => {
        const { supplierId } = req.params;

        // Set user context for repository
        supplierRepository.setUserContext(req.user.id);

        const supplier = await supplierRepository.getById(supplierId);
        if (!supplier) {
            throw createNotFoundError('Supplier', supplierId);
        }

        sendSuccessResponse(req, res, { supplier });
    })
);

/**
 * GET /api/suppliers/:supplierId/items
 * Get all items for a specific supplier
 */
router.get('/:supplierId/items',
    validateParams({ supplierId: { type: 'id' } }),
    enhancedAsyncHandler(async (req, res) => {
        const { supplierId } = req.params;

        // Set user context for repository
        supplierRepository.setUserContext(req.user.id);

        // Verify supplier exists
        const supplier = await supplierRepository.getById(supplierId);
        if (!supplier) {
            throw createNotFoundError('Supplier', supplierId);
        }

        const items = await supplierRepository.getItemsBySupplierId(supplierId);
        
        sendSuccessResponse(req, res, { items, supplier: supplier.name }, {
            count: items.length,
            message: 'Supplier items retrieved successfully'
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
    enhancedAsyncHandler(async (req, res) => {
        const { supplierPriceId } = req.params;
        const { price } = req.body;

        // Set user context for repository
        supplierRepository.setUserContext(req.user.id);

        const updatedPrice = await supplierRepository.updatePrice(supplierPriceId, price);
        
        if (!updatedPrice) {
            throw createNotFoundError('Supplier price record', supplierPriceId);
        }

        sendSuccessResponse(req, res, { supplierPrice: updatedPrice }, {
            message: 'Price updated successfully'
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
    enhancedAsyncHandler(async (req, res) => {
        const { supplierPriceId } = req.params;

        // Set user context for repository
        supplierRepository.setUserContext(req.user.id);

        const deleted = await supplierRepository.removeProduct(supplierPriceId);
        
        if (!deleted) {
            throw createNotFoundError('Supplier price record', supplierPriceId);
        }

        sendSuccessResponse(req, res, {}, {
            message: 'Item removed from supplier successfully'
        });
    })
);

module.exports = router;