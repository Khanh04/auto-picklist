import React from 'react'
import { render, screen, waitFor } from '../../../test-utils/render'
import userEvent from '@testing-library/user-event'
import EditableCell from '../EditableCell'
import { mockPicklistItem, mockItems } from '../../../test-utils/mockData'

// Mock Material-UI Autocomplete to simplify testing
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  Autocomplete: ({ renderInput, options, onChange, value, renderOption }) => {
    const input = renderInput({
      inputProps: { 'data-testid': 'autocomplete-input' }
    })

    return (
      <div>
        {input}
        <div data-testid="autocomplete-options">
          {options.map((option, index) => (
            <div key={index} onClick={() => onChange({}, option)}>
              {renderOption ? renderOption({}, option) : option.label}
            </div>
          ))}
        </div>
      </div>
    )
  },
  TextField: ({ placeholder, ...props }) => (
    <input placeholder={placeholder} {...props.inputProps} />
  )
}))

describe('EditableCell', () => {
  const defaultProps = {
    item: mockPicklistItem,
    index: 0,
    field: 'originalItem',
    value: 'Test Item',
    editingCell: null,
    selectOptions: mockItems.map(item => ({
      value: item.id,
      label: item.description,
      item
    })),
    fuseInstance: {
      search: jest.fn(() => [])
    },
    availableSuppliers: ['Supplier A', 'Supplier B', 'back order'],
    productSuppliers: {
      1: [
        { supplier_price_id: 1, supplier_name: 'Supplier A', price: 10.99 },
        { supplier_price_id: 2, supplier_name: 'Supplier B', price: 12.50 }
      ]
    },
    onCellEdit: jest.fn(),
    onSelectChange: jest.fn(),
    onCellClick: jest.fn(),
    onCellBlur: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('originalItem field', () => {
    it('renders as non-editable text', () => {
      render(<EditableCell {...defaultProps} />)

      expect(screen.getByText('Test Item')).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('quantity field', () => {
    const quantityProps = {
      ...defaultProps,
      field: 'quantity',
      value: 5
    }

    it('renders as clickable display when not editing', () => {
      render(<EditableCell {...quantityProps} />)

      const cell = screen.getByText('5')
      expect(cell).toBeInTheDocument()
      expect(cell).toHaveClass('cursor-pointer')
    })

    it('becomes editable input when clicked', () => {
      const propsWithEditing = {
        ...quantityProps,
        editingCell: { row: 0, field: 'quantity' }
      }

      render(<EditableCell {...propsWithEditing} />)

      const input = screen.getByRole('spinbutton')
      expect(input).toHaveValue(5)
      expect(input).toHaveAttribute('type', 'number')
      expect(input).toHaveAttribute('step', '1')
      expect(input).toHaveAttribute('min', '0')
    })

    it('calls onCellEdit when value changes', async () => {
      const user = userEvent.setup()
      const propsWithEditing = {
        ...quantityProps,
        editingCell: { row: 0, field: 'quantity' }
      }

      render(<EditableCell {...propsWithEditing} />)

      const input = screen.getByRole('spinbutton')
      await user.clear(input)
      await user.type(input, '10')

      expect(defaultProps.onCellEdit).toHaveBeenCalledWith(0, 'quantity', '10')
    })

    it('calls onCellClick when display is clicked', async () => {
      const user = userEvent.setup()
      render(<EditableCell {...quantityProps} />)

      const cell = screen.getByText('5')
      await user.click(cell)

      expect(defaultProps.onCellClick).toHaveBeenCalledWith(0, 'quantity')
    })
  })

  describe('unitPrice field', () => {
    const priceProps = {
      ...defaultProps,
      field: 'unitPrice',
      value: 10.99
    }

    it('renders formatted price when not editing', () => {
      render(<EditableCell {...priceProps} />)

      expect(screen.getByText('$10.99')).toBeInTheDocument()
    })

    it('becomes numeric input when editing', () => {
      const propsWithEditing = {
        ...priceProps,
        editingCell: { row: 0, field: 'unitPrice' }
      }

      render(<EditableCell {...propsWithEditing} />)

      const input = screen.getByRole('spinbutton')
      expect(input).toHaveValue(10.99)
      expect(input).toHaveAttribute('step', '0.01')
    })
  })

  describe('totalPrice field', () => {
    it('renders formatted total price', () => {
      const totalProps = {
        ...defaultProps,
        field: 'totalPrice',
        value: '21.98'
      }

      render(<EditableCell {...totalProps} />)

      expect(screen.getByText('$21.98')).toBeInTheDocument()
    })

    it('renders N/A without formatting', () => {
      const naProps = {
        ...defaultProps,
        field: 'totalPrice',
        value: 'N/A'
      }

      render(<EditableCell {...naProps} />)

      expect(screen.getByText('N/A')).toBeInTheDocument()
    })
  })

  describe('selectedSupplier field', () => {
    const supplierProps = {
      ...defaultProps,
      field: 'selectedSupplier',
      value: 'Supplier A'
    }

    it('renders supplier dropdown', () => {
      render(<EditableCell {...supplierProps} />)

      const select = screen.getByRole('combobox')
      expect(select).toHaveValue('Supplier A')
    })

    it('shows product-specific suppliers when available', () => {
      render(<EditableCell {...supplierProps} />)

      expect(screen.getByRole('option', { name: 'back order' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Supplier A — $10.99' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Supplier B — $12.50' })).toBeInTheDocument()
    })

    it('shows supplier count badge when multiple suppliers available', () => {
      render(<EditableCell {...supplierProps} />)

      expect(screen.getByText('2')).toBeInTheDocument() // Count badge
    })

    it('falls back to general suppliers list when no product-specific suppliers', () => {
      const propsWithoutProductSuppliers = {
        ...supplierProps,
        item: { ...mockPicklistItem, matchedItemId: null }
      }

      render(<EditableCell {...propsWithoutProductSuppliers} />)

      expect(screen.getByRole('option', { name: 'Supplier A' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Supplier B' })).toBeInTheDocument()
      expect(screen.queryByText('—')).not.toBeInTheDocument() // No prices
    })

    it('calls onCellEdit when supplier changes', async () => {
      const user = userEvent.setup()
      render(<EditableCell {...supplierProps} />)

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, 'Supplier B')

      expect(defaultProps.onCellEdit).toHaveBeenCalledWith(0, 'selectedSupplier', 'Supplier B')
    })
  })

  describe('matchedItem field', () => {
    const matchedItemProps = {
      ...defaultProps,
      field: 'matchedItem',
      value: 'Test Item 1'
    }

    it('renders autocomplete component', () => {
      render(<EditableCell {...matchedItemProps} />)

      expect(screen.getByTestId('autocomplete-input')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('No match / Select item...')).toBeInTheDocument()
    })

    it('shows learned match indicator when applicable', () => {
      const propsWithLearnedMatch = {
        ...matchedItemProps,
        item: { ...mockPicklistItem, learnedMatch: true }
      }

      render(<EditableCell {...propsWithLearnedMatch} />)

      expect(screen.getByText('AI')).toBeInTheDocument()
      expect(screen.getByText('Learned preference applied')).toBeInTheDocument()
    })

    it('calls onSelectChange when option is selected', async () => {
      const user = userEvent.setup()
      render(<EditableCell {...matchedItemProps} />)

      const option = screen.getByText('Test Item 1')
      await user.click(option)

      expect(defaultProps.onSelectChange).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA attributes for editable fields', () => {
      const quantityProps = {
        ...defaultProps,
        field: 'quantity',
        value: 5,
        editingCell: { row: 0, field: 'quantity' }
      }

      render(<EditableCell {...quantityProps} />)

      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('autoFocus')
    })

    it('has proper focus management', () => {
      const priceProps = {
        ...defaultProps,
        field: 'unitPrice',
        value: 10.99,
        editingCell: { row: 0, field: 'unitPrice' }
      }

      render(<EditableCell {...priceProps} />)

      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('autoFocus')
    })
  })
})