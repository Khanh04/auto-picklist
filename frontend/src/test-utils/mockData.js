// Mock picklist data for testing
export const mockPicklistItem = {
  originalItem: 'Original Test Item',
  quantity: 2,
  matchedItemId: 1,
  item: 'Test Item 1',
  selectedSupplier: 'Supplier A',
  unitPrice: 10.99,
  totalPrice: '21.98',
  manualOverride: false,
  isPreference: false,
  learnedMatch: false
}

export const mockPicklist = [
  {
    ...mockPicklistItem,
    originalItem: 'Test Item 1',
    quantity: 1,
    matchedItemId: 1,
    item: 'Test Item 1',
    totalPrice: '10.99'
  },
  {
    ...mockPicklistItem,
    originalItem: 'Test Item 2',
    quantity: 3,
    matchedItemId: 2,
    item: 'Test Item 2',
    selectedSupplier: 'Supplier B',
    unitPrice: 15.50,
    totalPrice: '46.50'
  },
  {
    ...mockPicklistItem,
    originalItem: 'Test Item 3',
    quantity: 1,
    matchedItemId: null,
    item: 'Test Item 3',
    selectedSupplier: 'back order',
    unitPrice: '',
    totalPrice: 'N/A',
    isPreference: true
  }
]

export const mockResults = {
  picklist: mockPicklist,
  multiCsvData: {
    metadata: {
      filesProcessed: 2,
      totalOriginalItems: 5,
      totalUniqueItems: 3
    },
    analytics: {
      supplierAnalysis: {
        totalSuppliers: 3
      }
    },
    files: [
      { filename: 'test1.csv' },
      { filename: 'test2.csv' }
    ]
  }
}

export const mockSuppliers = [
  { id: 1, name: 'Supplier A' },
  { id: 2, name: 'Supplier B' },
  { id: 3, name: 'Supplier C' }
]

export const mockItems = [
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

export const mockProductSuppliers = [
  { supplier_price_id: 1, supplier_name: 'Supplier A', price: 10.99 },
  { supplier_price_id: 2, supplier_name: 'Supplier B', price: 12.50 }
]