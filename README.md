# Auto Picklist Generator

An automated picklist generation system that reads PDF orders, matches items against Excel supplier data, and generates optimized supplier selections with the lowest prices.

## Features

- **Multi-Format Input**: Supports both PDF orders and eBay CSV order reports with auto-detection
- **PDF Order Processing**: Automatically extracts order items and quantities from PDF files
- **eBay CSV Processing**: Parses eBay order reports with quantity and item title columns
- **Excel Price Matching**: Dynamically detects supplier columns and matches items with intelligent scoring
- **Supplier Optimization**: Selects suppliers with the lowest prices for each item
- **Multiple Output Formats**: Generates both CSV and professional PDF reports
- **Modular Architecture**: Clean, maintainable code structure with separate modules

## Installation

```bash
npm install
```

## Dependencies

- `pdf-parse`: PDF text extraction
- `xlsx`: Excel file processing
- `pdfkit`: Professional PDF generation

## Usage

### Quick Start

```bash
npm start
```

The application automatically detects input format:
- **eBay CSV**: Looks for files containing "ebay" and "order" in filename
- **PDF**: Falls back to `H order.pdf` if no eBay CSV found
- **Price data**: `GENERAL PRICE LIST.xlsx` (supplier pricing)
- **Output**: `final_picklist.csv` and `final_picklist.pdf`

### Custom Configuration

```javascript
const AutoPicklistApp = require('./src/app');

// Use specific eBay CSV file
const app = new AutoPicklistApp({
    inputType: 'ebay',  // 'pdf', 'ebay', or 'auto'
    ebayInputPath: 'eBay-OrdersReport-2024.csv',
    excelInputPath: 'custom-prices.xlsx',
    csvOutputPath: 'output.csv',
    pdfOutputPath: 'output.pdf'
});

// Use PDF input
const pdfApp = new AutoPicklistApp({
    inputType: 'pdf',
    pdfInputPath: 'custom-order.pdf'
});

app.run().then(result => {
    if (result.success) {
        console.log('Picklist generated successfully!');
        console.log(`Total cost: $${result.summary.totalCost.toFixed(2)}`);
    }
});
```

## File Structure

```
auto-picklist/
├── src/
│   ├── app.js                    # Main application class with auto-detection
│   └── modules/
│       ├── pdfParser.js          # PDF order parsing
│       ├── ebayParser.js         # eBay CSV order parsing
│       ├── priceListLoader.js    # Excel processing & item matching
│       ├── picklistGenerator.js  # Picklist creation & CSV export
│       └── pdfGenerator.js       # Professional PDF generation
├── create_picklist.js           # Legacy monolithic version
├── package.json
└── README.md
```

## How It Works

1. **Input Detection**: Automatically detects eBay CSV files or falls back to PDF parsing
2. **eBay CSV Parsing**: Extracts quantity and item title from standard eBay order reports
3. **PDF Parsing**: Extracts order items using regex patterns to identify quantity-item pairs
4. **Excel Processing**: Dynamically detects supplier columns across all rows
5. **Intelligent Matching**: Uses scoring algorithm prioritizing:
   - Exact substring matches (highest score)
   - Brand/product name matches
   - Multiple significant word matches
   - Single important word matches (lowest score)
6. **Price Optimization**: Among best-scoring matches, selects supplier with lowest price
7. **Output Generation**: Creates formatted CSV and professional PDF reports

## Matching Algorithm

The system uses an intelligent scoring system for item matching:

- **Score 10**: Exact substring match (first 15 characters)
- **Score 5**: Brand name match (first word)
- **Score 2-5**: Multiple significant words match (3+ characters)
- **Score 1**: Single important word match (4+ characters, excluding common terms)

## Input Format Requirements

### eBay CSV Format
- **Quantity Column**: Must contain "quantity" or "qty" in header
- **Item Column**: Must contain "title", "item", "product", or "name" in header
- **Auto-detection**: Files containing "ebay" and "order" in filename are automatically detected

### Excel Format Requirements
- **Item Column**: Must contain keywords like "item", "product", "name", or "description"
- **Supplier Columns**: All other columns are treated as potential suppliers
- **Price Format**: Supports various formats including "$12.50", "@12.50", "12.50"

## Output Files

### CSV Format
```
quantity,item,selectedSupplier,unitPrice,totalPrice
2,"#1 Eyelash Glue Beauty",USA,23,46.00
```

### PDF Format
Professional table layout with:
- Company header
- Order summary
- Itemized supplier selections
- Total cost calculation

## Scripts

- `npm start`: Run the application
- `npm run dev`: Development mode (same as start)
- `npm run legacy`: Run the original monolithic version

## Error Handling

- **PDF Parsing Failure**: Falls back to hardcoded order items
- **Excel Loading Error**: Returns null with error message
- **Missing Suppliers**: Items without matches show "No supplier found"
- **Invalid Prices**: Shows "No price found" for unparseable prices

## Development

The application follows a modular architecture:

- **app.js**: Main orchestration with auto-detection and configuration management
- **pdfParser.js**: Handles PDF text extraction and order item parsing
- **ebayParser.js**: Parses eBay CSV order reports with robust CSV handling
- **priceListLoader.js**: Manages Excel file loading and intelligent item matching
- **picklistGenerator.js**: Creates final picklist and CSV conversion
- **pdfGenerator.js**: Generates professional PDF reports

## License

MIT