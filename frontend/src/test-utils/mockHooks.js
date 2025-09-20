// Mock implementations for hooks used in testing

export const mockUsePicklistSync = {
  picklist: [],
  updateItem: jest.fn(),
  updateMultipleItems: jest.fn(),
  setPicklist: jest.fn(),
  loadInitialData: jest.fn()
}

export const mockUsePicklistData = {
  availableSuppliers: ['Supplier A', 'Supplier B', 'back order'],
  availableItems: [],
  selectOptions: [],
  productSuppliers: {},
  fuseInstance: {
    search: jest.fn(() => [])
  },
  fetchProductSuppliers: jest.fn(() => Promise.resolve([]))
}

export const mockUseBulkEdit = {
  selectedRows: new Set(),
  showBulkEdit: false,
  bulkMatchItem: null,
  bulkEditMode: 'item',
  setBulkEditMode: jest.fn(),
  setBulkMatchItem: jest.fn(),
  handleRowSelection: jest.fn(),
  handleSelectAll: jest.fn(),
  handleClearSelection: jest.fn()
}

export const mockUsePicklistOperations = {
  editingCell: null,
  exportResult: null,
  isExporting: false,
  handleSelectChange: jest.fn(),
  handleCellEdit: jest.fn(),
  handleBulkMatch: jest.fn(),
  handleBulkSupplierChange: jest.fn(),
  handleCellClick: jest.fn(),
  handleCellBlur: jest.fn(),
  calculateSummary: jest.fn(() => ({
    totalItems: 3,
    itemsWithSuppliers: 2,
    preferenceMatches: 1,
    totalCost: 57.49
  })),
  handleExport: jest.fn(),
  storePreferences: jest.fn()
}