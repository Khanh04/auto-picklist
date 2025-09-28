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
- `npm run migrate` - Run database migrations
- `npm run migrate:status` - Check migration status
- `npm run migrate:rollback` - Rollback last migration
- `npm run migrate:integrate` - Integrate existing database
- `npm run import-data` - Import Excel data to PostgreSQL database

### Testing
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Docker & Deployment
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Start Docker containers
- `npm run docker:stop` - Stop Docker containers
- `npm run deploy:railway` - Deploy to Railway platform

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
- `src/repositories/SupplierPreferenceRepository.js` - Supplier preference management

**Service Layer**: Business logic separation
- `src/services/MatchingService.js` - Core product matching algorithms with multiple strategies
- `src/services/PicklistService.js` - Picklist generation and optimization logic
- `src/services/MultiCsvService.js` - Multi-file CSV processing workflows
- `src/services/UserFirstMatchingService.js` - User preference-based matching
- `src/services/SupplierAllocationService.js` - Multi-supplier allocation management
- `src/services/ExcelImportService.js` - Excel data import processing

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
- Context API for global state (`frontend/src/contexts/PicklistContext.jsx`)
- Component-based architecture with Material-UI
- Real-time WebSocket communication
- Vite build system with development proxy

**Custom Hooks**: Modular state management
- `frontend/src/hooks/usePicklistSync.js` - Combines context state with persistence
- `frontend/src/hooks/usePicklistPersistence.js` - Database-only persistence (session storage removed)
- `frontend/src/hooks/useWebSocket.js` - Real-time WebSocket communication
- `frontend/src/hooks/usePicklistOperations.js` - Picklist manipulation operations
- `frontend/src/hooks/useBulkEdit.js` - Bulk editing functionality

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

## Development Workflow

### Multi-Supplier Architecture
The application supports complex multi-supplier allocation where items can be split across multiple suppliers. Key architectural decisions:
- Original indexes are used throughout for state management (display indexes eliminated)
- Multi-supplier items use `_reactKey` pattern for unique React rendering
- Supplier allocations tracked with `supplierId` parameters in API calls
- Real-time sync between frontend state and database via WebSocket

### Database Persistence Model
- **Session storage completely removed** - All persistence requires shareId for shared lists
- **Database-only approach** - No local storage, everything persists to PostgreSQL
- **Migration system** - Use `npm run migrate` for schema changes
- **Connection pooling** - Optimized for Railway deployment limits

### State Management Patterns
- **Context + Hooks** - `PicklistContext` with specialized hooks for different concerns
- **Immutable updates** - All state changes maintain immutability
- **Real-time sync** - WebSocket integration for collaborative editing
- **Optimistic UI** - Local updates immediately reflected, with error rollback

### API Architecture
- **RESTful design** - Standard HTTP methods with consistent response format
- **Normalized responses** - `ApiClient` handles both old and new response formats
- **Error handling** - Comprehensive error boundaries with user-friendly messages
- **WebSocket support** - Real-time updates for shared shopping lists

# Operating Rules
- Always start in **Plan Phase**: do not edit files or run shell until I approve a plan.
- First, map the codebase: list apps/packages, entry points, critical configs, tests, and CI.
- Identify risks: security, migrations, public APIs, and breaking-change surfaces.
- Produce a concrete **Plan** section with: impacted files, steps, commands you intend to run,
  test updates, and a rollback strategy.
- Wait for my approval. Only then execute.
- Use suitable agent whenever possible.

# Review Checklist
- Build graph of modules/packages; note hotspots by LOC and dependency fan-in.
- Search for TODO/FIXME, `@deprecated`, failing tests, lint errors.
- Confirm toolchain: Node/Python versions, package managers, formatters, linters, test runners.
- Note env/secrets files and treat them as off-limits.

# Execution Rules (after approval)
- Batch related edits; commit early/commit often with descriptive messages.
- Run linters/tests before and after each batch; summarize diffs and test results.
- Open a PR with summary, risks, and test evidence.
