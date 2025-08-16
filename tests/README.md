# Test Suite

This directory contains comprehensive tests for the auto-picklist application.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Files

### `databaseLoader.test.js`
Comprehensive tests for the matching algorithm, including:

- **Normalization Tests**: Text cleaning and standardization
- **Strategy Tests**: Each matching strategy (exact, brand, full-text, word)
- **Category Classification**: Polish vs tool item classification
- **Error Handling**: Database errors and edge cases
- **Word Filtering**: Common word exclusion logic
- **Real-world Scenarios**: Actual use cases and bug prevention

## Test Coverage

The tests cover:
- ✅ Item name normalization
- ✅ All 4 matching strategies
- ✅ Category-aware matching
- ✅ Cross-category match prevention
- ✅ Error handling and edge cases
- ✅ Word filtering logic
- ✅ Real-world matching scenarios

## Key Test Scenarios

1. **Prevents Bad Matches**: Ensures DND gel polish doesn't match nail brush tools
2. **Brand Matching**: Tests OPI items match correctly within category
3. **Price Selection**: Verifies best price selection among suppliers
4. **Input Validation**: Handles empty/short inputs properly
5. **Category Safety**: Polish items only match polish products, tools only match tools