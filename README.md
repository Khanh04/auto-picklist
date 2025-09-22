# Auto Picklist Generator

An automated picklist generation system that reads PDF orders or CSV files, matches items against Excel supplier data, and generates optimized supplier selections with the lowest prices. Available as both a command-line tool and a web application.

## Features

- **🌐 Modern React Web Interface**: Professional web app with component-based architecture and real-time state management
- **💻 Command Line Tool**: Full-featured CLI for batch processing and automation
- **🗄️ PostgreSQL Database**: High-performance database with intelligent text search and indexing
- **📄 Multi-Format Input**: Supports both PDF orders and eBay CSV order reports with auto-detection
- **🔍 Smart Matching**: Advanced algorithms with full-text search, brand matching, and fuzzy matching
- **💰 Supplier Optimization**: Selects suppliers with the lowest prices for each item
- **📋 Multiple Output Formats**: Generates both CSV and professional PDF reports
- **🏗️ Modular Architecture**: Clean, maintainable code structure with separate modules
- **⚡ Real-time Processing**: Instant feedback and progress tracking
- **🔄 Easy Migration**: Automated Excel-to-PostgreSQL data import

## Prerequisites

- **Node.js** 14.0.0 or higher
- **PostgreSQL** 12 or higher  
- **Modern web browser** with JavaScript enabled

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL database:**
   ```bash
   npm run setup-db
   ```

3. **Import Excel data to database:**
   ```bash
   npm run import-data
   ```

4. **Start the application:**
   ```bash
   npm run web
   ```

## Usage

### 🌐 React Web Application (Recommended)

The modern React interface provides the best user experience:

```bash
npm run web
```

Then open http://localhost:3000 in your browser to enjoy:
- **Modern React UI** with component-based architecture and smooth interactions
- **Drag-and-drop file upload** with real-time validation and progress tracking
- **Interactive results dashboard** with animated statistics and download options
- **Responsive design** that works perfectly on desktop, tablet, and mobile
- **Real-time error handling** with user-friendly messages and recovery options
- **Automatic database matching** with intelligent supplier selection

### Development Mode

For React development with hot reloading:

```bash
npm run dev-web
```

This starts both the Vite development server and the Express backend concurrently.

### 💻 Command Line Tool

```bash
npm start
```

The CLI automatically detects input format and uses the PostgreSQL database:
- **eBay CSV**: Looks for files containing "ebay" and "order" in filename
- **PDF**: Falls back to `H order.pdf` if no eBay CSV found
- **Database**: Queries PostgreSQL for real-time price matching
- **Output**: `final_picklist.csv` and `final_picklist.pdf`

### Custom Configuration

```javascript
const AutoPicklistApp = require('./src/app');

// Use database (default)
const app = new AutoPicklistApp({
    inputType: 'ebay',
    ebayInputPath: 'eBay-OrdersReport-2024.csv',
    useDatabase: true, // Default: uses PostgreSQL
    csvOutputPath: 'output.csv',
    pdfOutputPath: 'output.pdf'
});

// Use Excel file (legacy mode)
const legacyApp = new AutoPicklistApp({
    inputType: 'pdf',
    pdfInputPath: 'custom-order.pdf',
    useDatabase: false, // Fallback to Excel
    excelInputPath: 'GENERAL PRICE LIST.xlsx'
});

app.run().then(result => {
    if (result.success) {
        console.log('Picklist generated successfully!');
        console.log(`Total cost: $${result.summary.totalCost.toFixed(2)}`);
    }
});
```

### Database Configuration

Create a `.env` file for custom database settings:

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=autopicklist
DB_USER=postgres
DB_PASSWORD=your_password
```

## File Structure

```
auto-picklist/
├── frontend/                     # React frontend source
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── Header.jsx       # App header component
│   │   │   ├── FileUpload.jsx   # File upload with drag-and-drop
│   │   │   ├── Results.jsx      # Results display component
│   │   │   ├── ErrorDisplay.jsx # Error handling component
│   │   │   └── Footer.jsx       # App footer component
│   │   ├── App.jsx              # Main React application
│   │   ├── main.jsx             # React entry point
│   │   └── index.css            # Application styles
│   ├── index.html               # HTML template
│   └── vite.config.js           # Vite build configuration
├── public/                       # Built React application
│   ├── index.html               # Built HTML (generated)
│   └── assets/                  # Built JS/CSS assets (generated)
├── scripts/                     # Database setup scripts
│   ├── setup-database.js       # PostgreSQL schema creation
│   └── import-excel-data.js     # Excel to PostgreSQL migration
├── src/
│   ├── app.js                   # CLI application with database support
│   ├── database/
│   │   └── config.js            # PostgreSQL connection pool
│   └── modules/
│       ├── pdfParser.js         # PDF order parsing
│       ├── ebayParser.js        # eBay CSV order parsing
│       ├── databaseLoader.js    # PostgreSQL price matching
│       ├── priceListLoader.js   # Excel processing (legacy)
│       ├── picklistGenerator.js # Picklist creation & CSV export
│       └── pdfGenerator.js      # Professional PDF generation
├── server.js                    # Express.js web server
├── uploads/                     # Temporary file storage
├── vite.config.js              # React build configuration
├── .env.example                 # Database configuration template
├── create_picklist.js          # Legacy monolithic version
├── package.json
└── README.md
```

## How It Works

1. **Input Detection**: Automatically detects eBay CSV files or falls back to PDF parsing
2. **eBay CSV Parsing**: Extracts quantity and item title from standard eBay order reports  
3. **PDF Parsing**: Extracts order items using regex patterns to identify quantity-item pairs
4. **Database Querying**: Performs sophisticated PostgreSQL queries with multiple strategies:
   - **Exact substring matching** for precise product identification
   - **Brand name matching** using the first word of the product name
   - **Full-text search** with PostgreSQL's built-in text search capabilities
   - **Multi-word matching** for complex product descriptions
   - **Single keyword fallback** for partial matches
5. **Price Optimization**: Among matching products, selects supplier with lowest price
6. **Output Generation**: Creates formatted CSV and professional PDF reports with supplier selections

## Database Schema

**PostgreSQL tables:**

- **suppliers**: Stores supplier information with unique names
- **products**: Contains product descriptions with normalized text for searching
- **supplier_prices**: Junction table linking products to suppliers with prices
- **product_supplier_prices**: View combining all tables for efficient querying

**Matching Strategy:**

1. **Exact Match** (Priority 1): Direct substring matching for precise identification
2. **Brand Match** (Priority 2): Matches using the first word (brand name)
3. **Full-Text Search** (Priority 3): PostgreSQL's advanced text search with ranking
4. **Keyword Match** (Priority 4): Fallback using significant words from product names

## Input Format Requirements

### eBay CSV Format
- **Quantity Column**: Must contain "quantity" or "qty" in header
- **Item Column**: Must contain "title", "item", "product", or "name" in header
- **Auto-detection**: Files containing "ebay" and "order" in filename are automatically detected

### Excel Format Requirements (For Initial Import)
- **Item Column**: Must contain keywords like "item", "product", "name", or "description"
- **Supplier Columns**: All other columns are treated as potential suppliers
- **Price Format**: Supports various formats including "$12.50", "@12.50", "12.50"
- **Import Process**: Data is migrated to PostgreSQL during setup for better performance

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

- **`npm run web`**: Start the production React web application (recommended)
- **`npm run dev-web`**: Start development mode with hot reloading
- **`npm run build`**: Build React application for production
- **`npm start`**: Run the command-line application with database
- **`npm run setup-db`**: Create PostgreSQL database and schema
- **`npm run import-data`**: Import Excel data to PostgreSQL
- **`npm run dev`**: Development mode (same as start)
- **`npm run legacy`**: Run the original monolithic version

## Error Handling

- **Database Connection**: Automatically tests connection before processing
- **PDF Parsing Failure**: Falls back to hardcoded order items
- **Missing Suppliers**: Items without database matches show "No supplier found"
- **Invalid Data**: Handles malformed prices and descriptions gracefully
- **Legacy Mode**: Fallback to Excel processing if database is unavailable

## Development

The application follows a modular architecture:

**React Web Application:**
- **server.js**: Express.js web server with RESTful API endpoints for file upload and processing
- **frontend/**: Modern React application with component-based architecture
- **public/**: Built React application served by Express
- **vite.config.js**: Build configuration with development proxy and production optimization

**Core Engine:**
- **app.js**: CLI orchestration with database integration and configuration management
- **databaseLoader.js**: PostgreSQL integration with advanced querying and matching
- **pdfParser.js**: Handles PDF text extraction and order item parsing
- **ebayParser.js**: Parses eBay CSV order reports with robust CSV handling
- **priceListLoader.js**: Legacy Excel file processing (fallback mode)
- **picklistGenerator.js**: Creates final picklist and CSV conversion
- **pdfGenerator.js**: Generates professional PDF reports

**Database:**
- **config.js**: Connection pooling and PostgreSQL configuration
- **setup-database.js**: Schema creation and indexing
- **import-excel-data.js**: Migration utility for Excel-to-PostgreSQL
