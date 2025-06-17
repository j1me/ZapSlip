import { ParsedOrder } from './pdf-parser';

interface ExportOptions {
  dateRange?: { start: string; end: string };
  customer?: string;
  product?: string;
  category?: string;
}

function escapeCSV(value: string | number): string {
  if (typeof value === 'number') return value.toString();
  // Escape quotes and wrap in quotes if contains special characters
  const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n');
  if (needsQuotes) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function generateCSVContent(data: string[][]): string {
  return data.map(row => row.map(escapeCSV).join(',')).join('\n');
}

export function exportToExcel(orders: ParsedOrder[], options: ExportOptions = {}) {
  // Generate two sheets: Product Summary and Category Summary
  const productSummaryData: string[][] = [];
  const categorySummaryData: string[][] = [];

  // Product Summary Headers
  productSummaryData.push([
    'Order ID',
    'Order Date',
    'Customer Name',
    'Customer Address',
    'Product Name',
    'Quantity',
    'Category',
    'PDF Reference'
  ]);

  // Category Summary Headers
  categorySummaryData.push([
    'Category',
    'Total Products',
    'Total Quantity',
    'Product Details'
  ]);

  // Aggregate data for category summary
  const categoryAggregates: Record<string, {
    products: Set<string>;
    totalQty: number;
    details: string[];
  }> = {};

  // Populate Product Summary
  orders.forEach(order => {
    order.items.forEach((item, index) => {
      const category = order.derivedCategories[index]?.category || 'Uncategorized';
      
      // Add to product summary
      productSummaryData.push([
        order.orderId,
        order.orderDate,
        order.customer.name,
        order.customer.address,
        item.name,
        item.qty.toString(),
        category,
        order.pdfBlobUrl
      ]);

      // Aggregate for category summary
      if (!categoryAggregates[category]) {
        categoryAggregates[category] = {
          products: new Set(),
          totalQty: 0,
          details: []
        };
      }
      categoryAggregates[category].products.add(item.name);
      categoryAggregates[category].totalQty += item.qty;
      categoryAggregates[category].details.push(
        `${item.name} (${item.qty} units)`
      );
    });
  });

  // Populate Category Summary
  Object.entries(categoryAggregates).forEach(([category, data]) => {
    categorySummaryData.push([
      category,
      data.products.size.toString(),
      data.totalQty.toString(),
      data.details.join('; ')
    ]);
  });

  // Create Blobs for each sheet
  const productSummaryBlob = new Blob(
    [generateCSVContent(productSummaryData)],
    { type: 'text/csv;charset=utf-8;' }
  );
  const categorySummaryBlob = new Blob(
    [generateCSVContent(categorySummaryData)],
    { type: 'text/csv;charset=utf-8;' }
  );

  // Create download links
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Download Product Summary
  const productLink = document.createElement('a');
  productLink.href = URL.createObjectURL(productSummaryBlob);
  productLink.download = `zapslip-product-summary-${timestamp}.csv`;
  productLink.style.display = 'none';
  document.body.appendChild(productLink);
  productLink.click();
  document.body.removeChild(productLink);

  // Small delay between downloads to prevent browser issues
  setTimeout(() => {
    // Download Category Summary
    const categoryLink = document.createElement('a');
    categoryLink.href = URL.createObjectURL(categorySummaryBlob);
    categoryLink.download = `zapslip-category-summary-${timestamp}.csv`;
    categoryLink.style.display = 'none';
    document.body.appendChild(categoryLink);
    categoryLink.click();
    document.body.removeChild(categoryLink);
  }, 100);
}

// Helper function to format date for Excel
export function formatExcelDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// Helper function to create a summary string
export function createSummaryString(orders: ParsedOrder[]): string {
  const totalOrders = orders.length;
  const uniqueCustomers = new Set(orders.map(o => o.customer.name)).size;
  const totalProducts = orders.reduce((sum, order) => 
    sum + order.items.reduce((itemSum, item) => itemSum + item.qty, 0), 0
  );
  const uniqueCategories = new Set(
    orders.flatMap(o => o.derivedCategories.map(c => c.category))
  ).size;

  return `Summary: ${totalOrders} orders, ${uniqueCustomers} customers, ` +
    `${totalProducts} total products across ${uniqueCategories} categories`;
} 