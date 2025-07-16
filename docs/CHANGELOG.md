# ZapSlip Changelog

All notable changes to the ZapSlip project are documented in this file.

## [2.2.0] - 2024-01-XX - Enhanced Parsing & Dynamic Categories

### 🚀 Major Features

#### Dynamic Category System
- **Google Sheets Integration**: Real-time category lookup from cloud-based Google Sheets
- **Dual-source System**: Primary Google Sheets with static fallback for reliability
- **Live Updates**: Category changes reflect immediately without code deployment
- **Collaborative Management**: Multiple users can maintain categories through shared sheets

#### Enhanced PDF Parser v2.2
- **Advanced Product Name Parsing**: Improved multi-line product name detection and combination
- **Embedded Quantity Detection**: Extracts quantities from product name lines (e.g., "Product Name 1 of 1")
- **Flexible Filename Support**: Robust regex patterns handling various filename formats
- **Duplicate Prevention**: Smart detection and elimination of repeated product entries

### 🐛 Critical Bug Fixes

#### Customer Name Extraction
- **Fixed**: Jayashree and Chitra Gopal names not being detected
- **Root Cause**: Filenames with trailing spaces and periods (e.g., "Jayashree ._")
- **Solution**: Enhanced regex patterns to handle `[\s\.]*` before final underscore
- **Impact**: Now correctly extracts names from all tested filename variations

#### Date Format Support
- **Fixed**: Date extraction failing for files without year (DD.MM vs DD.MM.YYYY)
- **Solution**: Updated regex to `(\d{2}\.\d{2}(?:\.\d{4}|\.\d{2})?)`
- **Supported Formats**: 
  - `15.07.2025`
  - `15.07.25` 
  - `15.07`

#### Duplicate Product Parsing
- **Fixed**: Products with embedded quantities being processed twice
- **Example**: "Murukku Combo (3 Varieties) 1 of 1" appearing as two separate items
- **Solution**: Early detection and extraction of quantity from product name line
- **Result**: Single product entry with correct quantity

### 🔧 Technical Improvements

#### PDF Processing Engine
- **PDF.js Version**: Updated to stable version 3.11.174 for better compatibility
- **Multi-page Support**: Enhanced text extraction across all PDF pages
- **Text Positioning**: Improved line grouping based on Y-coordinates
- **Error Recovery**: Better handling of malformed PDFs and extraction failures

#### Category Matching Algorithms
- **Product Name Normalization**: Advanced text cleaning including:
  - Portion size standardization (ml, ML, Lt, g, gm, kg, etc.)
  - Empty parentheses removal
  - Space normalization
  - Special character handling
- **Multi-strategy Matching**:
  1. Exact match (highest confidence)
  2. Normalized match (high confidence)
  3. Fuzzy word-based match (medium confidence)
  4. Best product match (low confidence)
- **Confidence Levels**: Clear indication of categorization reliability

#### Enhanced Data Structures
```typescript
// Improved ParsedOrder interface
interface ParsedOrder {
    orderId: string;
    orderDate: string;
    customer: {
        name: string;
        address: string;
    };
    items: Array<{
        name: string;
        qty: number;
        portionSize?: string;
    }>;
    pdfBlobUrl: string;
    derivedCategories: Array<{
        product: string;
        category: string;
    }>;
}
```

### 📊 Enhanced Reporting

#### Product Summary
- **Aggregated Quantities**: Cross-order quantity summation
- **Category Assignments**: Confidence indicators for categorization
- **Order Traceability**: Direct links to source orders and PDFs
- **Portion Information**: Display portion sizes where available

#### Category Summary  
- **Category-wise Totals**: Comprehensive breakdowns by category
- **Product Diversity**: Metrics showing variety within categories
- **Detailed Analytics**: Expandable views with granular information
- **Dynamic Updates**: Real-time updates as categories change

### 🎯 User Experience Improvements

#### Error Handling
- **Graceful Degradation**: Automatic fallback mechanisms
- **User-friendly Messages**: Clear error communication
- **Progress Tracking**: Real-time processing status updates
- **Debugging Support**: Enhanced console logging for troubleshooting

#### Performance Optimizations
- **Batch Processing**: Optimized handling of multiple files
- **Memory Management**: Efficient handling of large PDF files
- **Debounced Filtering**: Smooth real-time filtering without performance impact
- **Caching**: Reduced redundant processing through intelligent caching

### 🔒 Security & Privacy

#### Data Protection
- **Local Processing**: All PDF parsing happens client-side
- **No File Upload**: PDFs never leave the user's browser
- **Secure Communication**: HTTPS for Google Sheets integration
- **Input Validation**: Comprehensive file type and size validation

### 🛠️ Developer Experience

#### Code Quality
- **Enhanced Documentation**: Comprehensive technical reference updates
- **Type Safety**: Improved TypeScript definitions
- **Error Tracking**: Comprehensive error logging and monitoring
- **Performance Monitoring**: Built-in performance measurement tools

#### Debugging Tools
```javascript
// Enhanced logging system
console.log('=== Starting PDF parsing ===');
console.log('Extracted quantity from product name:', productName, qty);
console.log('Looking up category for:', cleanedName);
console.log('Category found:', category);
```

### 📋 Supported Filename Patterns

The system now robustly handles various filename formats:
- `packing_slip_SSH3978_ Varada ._15.07.2025.pdf`
- `packing_slip_SSH3979_ Samapika Dash_15.07.2025.pdf`
- `packing_slip_SSH3981_Chitra Gopal_15.07.pdf`
- `packing_slip_SSH3982_Jayashree ._15.07.pdf`

### 🔄 Migration & Compatibility

#### Backward Compatibility
- **Existing Data**: Full compatibility with previously processed data
- **Static Categories**: All existing static categories preserved as fallback
- **Export Formats**: Maintained compatibility with existing export structures

#### Upgrade Path
- **Automatic**: No manual intervention required
- **Progressive Enhancement**: New features activate automatically
- **Fallback Protection**: Static categories ensure no service disruption

---

## [2.1.0] - Previous Release

### Features
- Basic PDF parsing functionality
- Static category lookup system
- Product and category reporting
- CSV export capabilities
- Multi-file processing

---

## [2.0.0] - Initial Release

### Features
- Core PDF parsing with PDF.js
- Basic product extraction
- Simple categorization
- Export functionality
- Web-based interface

---

## Upcoming Features

### 🚧 In Development
- **Machine Learning Categories**: AI-powered category suggestions
- **Batch Category Management**: Bulk category update tools
- **Analytics Dashboard**: Visual category performance metrics
- **Custom Rules Engine**: User-defined categorization logic

### 🎯 Planned Enhancements
- **Multi-language Support**: Categories in multiple languages
- **Inventory Integration**: Link categories to stock management systems
- **Nutritional Data**: Category-based nutritional information
- **Mobile Optimization**: Enhanced mobile device support

---

## Breaking Changes

### None in v2.2.0
This release maintains full backward compatibility while adding significant new functionality.

---

## Contributors

- **Development Team**: Enhanced PDF parsing algorithms and dynamic category system
- **QA Team**: Comprehensive testing of filename variations and edge cases
- **Documentation Team**: Updated technical documentation and user guides

---

## Support

For technical issues or questions:
- **Documentation**: See `/docs/` folder for comprehensive guides
- **Issues**: Check console logs for detailed error information
- **Updates**: Monitor Google Sheets for category management

---

*Note: Version numbers follow semantic versioning (MAJOR.MINOR.PATCH)* 