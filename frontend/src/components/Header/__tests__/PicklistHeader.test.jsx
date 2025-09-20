import React from 'react'
import { render, screen } from '../../../test-utils/render'
import PicklistHeader from '../PicklistHeader'
import { mockResults } from '../../../test-utils/mockData'

describe('PicklistHeader', () => {
  const mockSummary = {
    totalItems: 3,
    itemsWithSuppliers: 2,
    preferenceMatches: 1,
    totalCost: 57.49
  }

  it('renders basic picklist preview header', () => {
    const results = { picklist: [] }

    render(<PicklistHeader results={results} summary={mockSummary} />)

    expect(screen.getByText('Picklist Preview')).toBeInTheDocument()
    expect(screen.getByText('Review and edit your picklist before exporting')).toBeInTheDocument()
  })

  it('renders combined picklist header for multi-CSV', () => {
    render(<PicklistHeader results={mockResults} summary={mockSummary} />)

    expect(screen.getByText('Combined Picklist Preview')).toBeInTheDocument()
    expect(screen.getByText('Review and edit your picklist before exporting')).toBeInTheDocument()
  })

  it('displays summary statistics correctly', () => {
    const results = { picklist: [] }

    render(<PicklistHeader results={results} summary={mockSummary} />)

    expect(screen.getByText('3')).toBeInTheDocument() // Total items
    expect(screen.getByText('Total Items')).toBeInTheDocument()

    expect(screen.getByText('2')).toBeInTheDocument() // Items with suppliers
    expect(screen.getByText('Items with Suppliers')).toBeInTheDocument()

    expect(screen.getByText('⭐ 1')).toBeInTheDocument() // Preference matches
    expect(screen.getByText('Preference Matches')).toBeInTheDocument()

    expect(screen.getByText('$57.49')).toBeInTheDocument() // Total cost
    expect(screen.getByText('Estimated Total')).toBeInTheDocument()
  })

  it('renders multi-CSV analytics when available', () => {
    render(<PicklistHeader results={mockResults} summary={mockSummary} />)

    expect(screen.getByText('📊')).toBeInTheDocument()
    expect(screen.getByText('Multi-CSV Analysis')).toBeInTheDocument()

    // Check analytics data
    expect(screen.getByText('2')).toBeInTheDocument() // Files processed
    expect(screen.getByText('Files Processed')).toBeInTheDocument()

    expect(screen.getByText('5')).toBeInTheDocument() // Total original items
    expect(screen.getByText('Total Items')).toBeInTheDocument()

    expect(screen.getByText('3')).toBeInTheDocument() // Unique items
    expect(screen.getByText('Unique Items')).toBeInTheDocument()

    expect(screen.getByText('3')).toBeInTheDocument() // Suppliers
    expect(screen.getByText('Suppliers')).toBeInTheDocument()
  })

  it('displays file list for multi-CSV processing', () => {
    render(<PicklistHeader results={mockResults} summary={mockSummary} />)

    expect(screen.getByText('Files: test1.csv, test2.csv')).toBeInTheDocument()
  })

  it('does not render multi-CSV analytics for single file', () => {
    const singleFileResults = {
      picklist: [],
      multiCsvData: {
        ...mockResults.multiCsvData,
        files: [{ filename: 'single.csv' }]
      }
    }

    render(<PicklistHeader results={singleFileResults} summary={mockSummary} />)

    // Multi-CSV analytics should still render but file list should not show for single file
    expect(screen.getByText('Multi-CSV Analysis')).toBeInTheDocument()
    expect(screen.queryByText('Files:')).not.toBeInTheDocument()
  })

  it('handles missing analytics data gracefully', () => {
    const resultsWithoutAnalytics = {
      picklist: [],
      multiCsvData: {
        metadata: {
          filesProcessed: 1,
          totalOriginalItems: 3,
          totalUniqueItems: 2
        },
        files: [{ filename: 'test.csv' }]
      }
    }

    render(<PicklistHeader results={resultsWithoutAnalytics} summary={mockSummary} />)

    expect(screen.getByText('0')).toBeInTheDocument() // Default for missing suppliers
  })

  it('has proper styling and layout classes', () => {
    render(<PicklistHeader results={mockResults} summary={mockSummary} />)

    const header = screen.getByText('Combined Picklist Preview').closest('div')
    expect(header).toHaveClass('text-center', 'mb-8')

    const multiCsvSection = screen.getByText('Multi-CSV Analysis').closest('div')
    expect(multiCsvSection).toHaveClass('bg-gradient-to-r', 'from-purple-50', 'to-blue-50')

    const summaryGrid = screen.getByText('Total Items').closest('div').parentElement
    expect(summaryGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-4', 'gap-4')
  })

  it('formats total cost correctly', () => {
    const summaryWithLargeCost = {
      ...mockSummary,
      totalCost: 1234.567
    }

    render(<PicklistHeader results={{ picklist: [] }} summary={summaryWithLargeCost} />)

    expect(screen.getByText('$1234.57')).toBeInTheDocument()
  })

  it('handles zero values correctly', () => {
    const zeroSummary = {
      totalItems: 0,
      itemsWithSuppliers: 0,
      preferenceMatches: 0,
      totalCost: 0
    }

    render(<PicklistHeader results={{ picklist: [] }} summary={zeroSummary} />)

    expect(screen.getAllByText('0')).toHaveLength(3) // totalItems, itemsWithSuppliers, preferenceMatches
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })
})