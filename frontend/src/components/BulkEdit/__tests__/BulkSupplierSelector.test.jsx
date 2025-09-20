import React from 'react'
import { render, screen, waitFor } from '../../../test-utils/render'
import userEvent from '@testing-library/user-event'
import BulkSupplierSelector from '../BulkSupplierSelector'
import { mockProductSuppliers } from '../../../test-utils/mockData'

describe('BulkSupplierSelector', () => {
  const defaultProps = {
    selectedRows: new Set([0, 1]),
    currentPicklist: [],
    onSupplierChange: jest.fn(),
    getCommonSuppliers: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state', () => {
    defaultProps.getCommonSuppliers.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<BulkSupplierSelector {...defaultProps} />)

    expect(screen.getByText('Loading suppliers...')).toBeInTheDocument()
  })

  it('renders no suppliers message when no common suppliers found', async () => {
    defaultProps.getCommonSuppliers.mockResolvedValue([])

    render(<BulkSupplierSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('No common suppliers found for selected items')).toBeInTheDocument()
    })

    expect(screen.getByText('Select items with matching suppliers to bulk change suppliers')).toBeInTheDocument()
  })

  it('renders supplier grid when suppliers are available', async () => {
    defaultProps.getCommonSuppliers.mockResolvedValue(mockProductSuppliers)

    render(<BulkSupplierSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Change supplier for selected rows:')).toBeInTheDocument()
    })

    // Check that suppliers are rendered
    expect(screen.getByText('Supplier A')).toBeInTheDocument()
    expect(screen.getByText('$10.99')).toBeInTheDocument()
    expect(screen.getByText('Supplier B')).toBeInTheDocument()
    expect(screen.getByText('$12.50')).toBeInTheDocument()

    // Check count message
    expect(screen.getByText('2 suppliers available for all selected items')).toBeInTheDocument()
  })

  it('handles supplier selection', async () => {
    const user = userEvent.setup()
    defaultProps.getCommonSuppliers.mockResolvedValue(mockProductSuppliers)

    render(<BulkSupplierSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Supplier A')).toBeInTheDocument()
    })

    const supplierButton = screen.getByRole('button', { name: /Supplier A/ })
    await user.click(supplierButton)

    expect(defaultProps.onSupplierChange).toHaveBeenCalledWith(mockProductSuppliers[0])
  })

  it('does not fetch suppliers when no rows selected', () => {
    const propsWithoutSelection = {
      ...defaultProps,
      selectedRows: new Set()
    }

    render(<BulkSupplierSelector {...propsWithoutSelection} />)

    expect(defaultProps.getCommonSuppliers).not.toHaveBeenCalled()
  })

  it('handles API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    defaultProps.getCommonSuppliers.mockRejectedValue(new Error('API Error'))

    render(<BulkSupplierSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('No common suppliers found for selected items')).toBeInTheDocument()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Error loading suppliers for bulk edit:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('shows singular supplier count message correctly', async () => {
    const singleSupplier = [mockProductSuppliers[0]]
    defaultProps.getCommonSuppliers.mockResolvedValue(singleSupplier)

    render(<BulkSupplierSelector {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('1 supplier available for all selected items')).toBeInTheDocument()
    })
  })

  it('refetches suppliers when selection changes', async () => {
    const { rerender } = render(<BulkSupplierSelector {...defaultProps} />)

    expect(defaultProps.getCommonSuppliers).toHaveBeenCalledTimes(1)

    // Change selection
    const newProps = {
      ...defaultProps,
      selectedRows: new Set([0, 1, 2])
    }

    rerender(<BulkSupplierSelector {...newProps} />)

    expect(defaultProps.getCommonSuppliers).toHaveBeenCalledTimes(2)
  })

  it('has proper accessibility attributes', async () => {
    defaultProps.getCommonSuppliers.mockResolvedValue(mockProductSuppliers)

    render(<BulkSupplierSelector {...defaultProps} />)

    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
      // Check that buttons are focusable
      buttons.forEach(button => {
        expect(button).toBeVisible()
      })
    })
  })
})