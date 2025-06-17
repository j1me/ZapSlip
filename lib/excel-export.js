import { groupByProduct, groupByCategory } from './pdf-parser.js';

// Helper function to create CSV content
function createCSV(data) {
  return data.map(row => 
    row.map(cell => {
      // Handle cells that contain commas, quotes, or newlines
      if (typeof cell === 'string' && /[",\n]/.test(cell)) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');
}

// Helper function to download CSV
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportToExcel(orders, filters = {}) {
  // Create Product Summary sheet
  const productTotals = groupByProduct(orders);
  const productRows = [
    ['Product', 'Quantity', 'Category'],
    ...Object.entries(productTotals).map(([product, qty]) => {
      const category = orders.find(o => 
        o.items.some(i => i.name === product)
      )?.derivedCategories.find(c => 
        c.product === product
      )?.category || 'Uncategorized';
      return [product, qty, category];
    })
  ];
  
  // Create Category Summary sheet
  const categoryTotals = groupByCategory(orders);
  const categoryRows = [
    ['Category', 'Total Products', 'Total Quantity', 'Product Details'],
    ...Object.entries(categoryTotals).map(([category, data]) => [
      category,
      data.products.size,
      data.totalQty,
      data.details.join(', ')
    ])
  ];

  // Create Orders sheet
  const orderRows = [
    ['Order ID', 'Date', 'Customer', 'Address', 'Products'],
    ...orders.map(order => [
      order.orderId,
      order.orderDate,
      order.customer.name,
      order.customer.address,
      order.items.map(item => `${item.name} (${item.qty})`).join(', ')
    ])
  ];

  // Generate filenames with filter info
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filterInfo = [];
  
  if (filters.dateRange) {
    filterInfo.push(`${filters.dateRange.start}_to_${filters.dateRange.end}`);
  }
  if (filters.customer) filterInfo.push(`customer_${filters.customer}`);
  if (filters.product) filterInfo.push(`product_${filters.product}`);
  if (filters.category) filterInfo.push(`category_${filters.category}`);
  
  const filterSuffix = filterInfo.length > 0 ? `_${filterInfo.join('_')}` : '';
  
  // Download each sheet
  downloadCSV(createCSV(productRows), `product_summary_${timestamp}${filterSuffix}.csv`);
  downloadCSV(createCSV(categoryRows), `category_summary_${timestamp}${filterSuffix}.csv`);
  downloadCSV(createCSV(orderRows), `orders_${timestamp}${filterSuffix}.csv`);
} 