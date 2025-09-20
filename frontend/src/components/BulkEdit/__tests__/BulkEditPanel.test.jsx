import React from 'react'
import { render, screen } from '../../../test-utils/render'
import userEvent from '@testing-library/user-event'
import BulkEditPanel from '../BulkEditPanel'

// Mock the child components
jest.mock('../BulkItemSelector', () => {
  return function MockBulkItemSelector({ onBulkMatch }) {
    return (
      <div data-testid="bulk-item-selector">
        <button onClick={() => onBulkMatch({ item: { id: 1, description: 'Test Item' } })}>
          Mock Bulk Match
        </button>
      </div>
    )
  }
})

jest.mock('../BulkSupplierSelector', () => {
  return function MockBulkSupplierSelector({ onSupplierChange }) {
    return (
      <div data-testid="bulk-supplier-selector">
        <button onClick={() => onSupplierChange({ supplier_name: 'Test Supplier', price: 10.99 })}>
          Mock Supplier Change
        </button>
      </div>
    )
  }
})

describe('BulkEditPanel', () => {
  const defaultProps = {
    selectedRows: new Set([0, 1]),
    bulkEditMode: 'item',
    setBulkEditMode: jest.fn(),
    bulkMatchItem: null,
    setBulkMatchItem: jest.fn(),
    selectOptions: [],
    fuseInstance: null,
    currentPicklist: [],
    onClearSelection: jest.fn(),
    onBulkMatch: jest.fn(),
    onBulkSupplierChange: jest.fn(),
    getCommonSuppliersForSelection: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders selection count and clear button', () => {
    render(<BulkEditPanel {...defaultProps} />)

    expect(screen.getByText('2 rows selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument()
  })

  it('renders singular selection count correctly', () => {
    const propsWithSingleSelection = {
      ...defaultProps,
      selectedRows: new Set([0])
    }

    render(<BulkEditPanel {...propsWithSingleSelection} />)

    expect(screen.getByText('1 row selected')).toBeInTheDocument()
  })

  it('renders mode selection tabs', () => {
    render(<BulkEditPanel {...defaultProps} />)

    expect(screen.getByRole('button', { name: 'Change Items' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change Suppliers' })).toBeInTheDocument()
  })

  it('highlights active tab correctly for item mode', () => {
    render(<BulkEditPanel {...defaultProps} />)

    const itemTab = screen.getByRole('button', { name: 'Change Items' })
    const supplierTab = screen.getByRole('button', { name: 'Change Suppliers' })

    expect(itemTab).toHaveClass('border-blue-600', 'text-blue-700', 'bg-blue-100')
    expect(supplierTab).toHaveClass('border-transparent', 'text-blue-600')
  })

  it('highlights active tab correctly for supplier mode', () => {
    const propsWithSupplierMode = {
      ...defaultProps,
      bulkEditMode: 'supplier'
    }

    render(<BulkEditPanel {...propsWithSupplierMode} />)

    const itemTab = screen.getByRole('button', { name: 'Change Items' })
    const supplierTab = screen.getByRole('button', { name: 'Change Suppliers' })

    expect(itemTab).toHaveClass('border-transparent', 'text-blue-600')
    expect(supplierTab).toHaveClass('border-blue-600', 'text-blue-700', 'bg-blue-100')
  })

  it('handles mode switching', async () => {
    const user = userEvent.setup()
    render(<BulkEditPanel {...defaultProps} />)

    const supplierTab = screen.getByRole('button', { name: 'Change Suppliers' })
    await user.click(supplierTab)

    expect(defaultProps.setBulkEditMode).toHaveBeenCalledWith('supplier')
  })

  it('handles clear selection', async () => {
    const user = userEvent.setup()
    render(<BulkEditPanel {...defaultProps} />)

    const clearButton = screen.getByRole('button', { name: 'Clear selection' })
    await user.click(clearButton)

    expect(defaultProps.onClearSelection).toHaveBeenCalled()
  })

  it('renders BulkItemSelector in item mode', () => {
    render(<BulkEditPanel {...defaultProps} />)

    expect(screen.getByTestId('bulk-item-selector')).toBeInTheDocument()
    expect(screen.queryByTestId('bulk-supplier-selector')).not.toBeInTheDocument()
  })

  it('renders BulkSupplierSelector in supplier mode', () => {
    const propsWithSupplierMode = {
      ...defaultProps,
      bulkEditMode: 'supplier'
    }

    render(<BulkEditPanel {...propsWithSupplierMode} />)

    expect(screen.queryByTestId('bulk-item-selector')).not.toBeInTheDocument()
    expect(screen.getByTestId('bulk-supplier-selector')).toBeInTheDocument()
  })

  it('forwards onBulkMatch calls correctly', async () => {
    const user = userEvent.setup()
    render(<BulkEditPanel {...defaultProps} />)

    const mockBulkMatchButton = screen.getByText('Mock Bulk Match')
    await user.click(mockBulkMatchButton)

    expect(defaultProps.onBulkMatch).toHaveBeenCalledWith({
      item: { id: 1, description: 'Test Item' }
    })
  })

  it('forwards onBulkSupplierChange calls correctly', async () => {
    const user = userEvent.setup()
    const propsWithSupplierMode = {
      ...defaultProps,
      bulkEditMode: 'supplier'
    }

    render(<BulkEditPanel {...propsWithSupplierMode} />)

    const mockSupplierChangeButton = screen.getByText('Mock Supplier Change')
    await user.click(mockSupplierChangeButton)

    expect(defaultProps.onBulkSupplierChange).toHaveBeenCalledWith({
      supplier_name: 'Test Supplier',
      price: 10.99
    })
  })

  it('has proper color scheme and styling', () => {
    render(<BulkEditPanel {...defaultProps} />)

    const panel = screen.getByText('2 rows selected').closest('div')
    expect(panel).toHaveClass('bg-blue-50', 'border', 'border-blue-200', 'rounded-lg')
  })

  it('passes correct props to child components', () => {
    render(<BulkEditPanel {...defaultProps} />)

    // BulkItemSelector should be rendered with correct props
    expect(screen.getByTestId('bulk-item-selector')).toBeInTheDocument()
  })
})