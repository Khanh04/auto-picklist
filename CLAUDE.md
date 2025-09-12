# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run web` - Start production React web application (port 3000)
- `npm run dev-web` - Development mode with hot reloading (Vite + Express)
- `npm run build` - Build React frontend for production
- `npm start` - Run CLI application with database integration
- `npm run dev` - Same as npm start (development mode)

### Database Management
- `npm run setup-db` - Create PostgreSQL database schema and tables
- `npm run import-data` - Import Excel data to PostgreSQL database
- `npm run setup-all` - Combined database setup and data import
- `npm run validate-setup` - Validate database setup and connections

### Testing
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Legacy Support
- `npm run legacy` - Run original monolithic version (create_picklist.js)
- `npm run start:legacy` - Start legacy server

## Architecture Overview

### Application Structure
This is a full-stack automated picklist generation system with three main interfaces:

1. **React Web Application** (`frontend/`) - Modern SPA with drag-and-drop file upload, real-time processing, and interactive results dashboard
2. **Express.js API Server** (`server.js`) - RESTful backend with WebSocket support for real-time updates
3. **CLI Tool** (`src/app.js`) - Command-line interface for batch processing and automation

### Core Architecture Patterns

**Repository Pattern**: Data access layer with dedicated repositories
- `src/repositories/BaseRepository.js` - Base class with common database operations
- `src/repositories/ProductRepository.js` - Product-specific queries and search logic
- `src/repositories/SupplierRepository.js` - Supplier management operations
- `src/repositories/PreferenceRepository.js` - User preference persistence

**Service Layer**: Business logic separation
- `src/services/MatchingService.js` - Core product matching algorithms with multiple strategies
- `src/services/PicklistService.js` - Picklist generation and optimization logic
- `src/services/MultiCsvService.js` - Multi-file CSV processing workflows

**Modular Design**: Core processing modules in `src/modules/`
- `pdfParser.js` - PDF text extraction and order parsing
- `ebayParser.js` - eBay CSV format processing
- `databaseLoader.js` - PostgreSQL integration with intelligent matching
- `picklistGenerator.js` - CSV generation and supplier optimization
- `pdfGenerator.js` - Professional PDF report creation

### Database Architecture
PostgreSQL with normalized schema:
- `suppliers` - Supplier master data
- `products` - Product descriptions with full-text search indexing
- `supplier_prices` - Price data with supplier relationships
- `product_supplier_prices` - Materialized view for efficient querying

**Matching Strategy Priority**:
1. Exact substring matching
2. Brand name matching (first word)
3. PostgreSQL full-text search with ranking
4. Keyword fallback matching

### Configuration System
Centralized configuration in `src/config/index.js`:
- Environment-aware settings (development/production/test)
- Database connection pooling with Railway optimization
- Feature flags and security settings
- Path management and validation

### Frontend Architecture
React SPA with:
- Context API for global state (`src/contexts/PicklistContext.jsx`)
- Component-based architecture with Material-UI
- Real-time WebSocket communication
- Vite build system with development proxy

### Key Integration Points

**File Processing Flow**:
1. File upload → Express multer middleware
2. Format detection (PDF/CSV/Excel)
3. Parser selection and item extraction
4. Database matching with multiple strategies
5. Supplier optimization and picklist generation
6. Output format generation (CSV/PDF)

**Real-time Communication**:
- WebSocket server for progress updates
- Session management for multi-step workflows
- Error handling with user-friendly messages

### Environment Configuration
- Copy `.env.example` to `.env` for local development
- Railway deployment uses environment variables
- Database connection pooling optimized for Railway limits
- SSL configuration handled automatically

### Testing Strategy
- Jest test suite with React Testing Library
- Component testing for UI elements
- Integration tests for data flow
- Database connection and migration testing

### Deployment Notes
- Railway-ready with automatic SSL and environment handling
- Docker support with compose configuration
- Database migrations handle schema updates
- Static asset serving optimized for production