import { http, HttpResponse } from 'msw'

// Mock data
const mockSuppliers = [
  { id: 1, name: 'Supplier A' },
  { id: 2, name: 'Supplier B' },
  { id: 3, name: 'Supplier C' }
]

const mockItems = [
  {
    id: 1,
    description: 'Test Item 1',
    bestSupplier: 'Supplier A',
    bestPrice: 10.99
  },
  {
    id: 2,
    description: 'Test Item 2',
    bestSupplier: 'Supplier B',
    bestPrice: 15.50
  },
  {
    id: 3,
    description: 'Test Item 3',
    bestSupplier: 'Supplier C',
    bestPrice: 8.75
  }
]

const mockProductSuppliers = {
  1: [
    { supplier_price_id: 1, supplier_name: 'Supplier A', price: 10.99 },
    { supplier_price_id: 2, supplier_name: 'Supplier B', price: 12.50 }
  ],
  2: [
    { supplier_price_id: 3, supplier_name: 'Supplier B', price: 15.50 },
    { supplier_price_id: 4, supplier_name: 'Supplier C', price: 16.00 }
  ],
  3: [
    { supplier_price_id: 5, supplier_name: 'Supplier C', price: 8.75 },
    { supplier_price_id: 6, supplier_name: 'Supplier A', price: 9.25 }
  ]
}

export const handlers = [
  // Get suppliers
  http.get('/api/suppliers', () => {
    return HttpResponse.json({
      suppliers: mockSuppliers
    })
  }),

  // Get items
  http.get('/api/items', () => {
    return HttpResponse.json({
      items: mockItems
    })
  }),

  // Get product suppliers
  http.get('/api/items/:productId/suppliers', ({ params }) => {
    const { productId } = params
    const suppliers = mockProductSuppliers[productId] || []
    return HttpResponse.json({
      suppliers
    })
  }),

  // Store preferences
  http.post('/api/preferences', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      saved: body.preferences.length
    })
  }),

  // Export picklist
  http.post('/export', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      csvUrl: '/downloads/test-picklist.csv',
      pdfUrl: '/downloads/test-picklist.pdf',
      filename: 'test-picklist'
    })
  }),

  // Health check
  http.get('/health', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    })
  })
]