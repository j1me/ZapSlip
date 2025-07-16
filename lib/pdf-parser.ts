import { CATEGORY_LOOKUP } from './category-lookup';

// Extend Window interface to include PDF.js
declare global {
  interface Window {
    'pdfjs-dist/build/pdf': any;
  }
}

export interface ParsedOrder {
  orderId: string;
  orderDate: string;
  customer: {
    name: string;
    address: string;
    region: string;
  };
  items: Array<{
    name: string;
    qty: number;
  }>;
  pdfBlobUrl: string;
  derivedCategories: Array<{
    product: string;
    category: string | null;
  }>;
}

// Load PDF.js from CDN
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';

export async function parsePDF(file: File): Promise<ParsedOrder> {
  // Create blob URL for reference
  const pdfBlobUrl = URL.createObjectURL(file);
  
  // Load the PDF document
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  // Get the first page
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const text = textContent.items.map((item: any) => item.str).join(' ');

  // Extract order details using regex patterns
  const orderIdMatch = text.match(/Order ID[:\s]+([A-Z0-9-]+)/i);
  const orderDateMatch = text.match(/Order Date[:\s]+(\d{2}[-.\/]\d{2}[-.\/]\d{4})/i);
  const customerNameMatch = text.match(/Customer Name[:\s]+([^\n]+)/i);
  const addressMatch = text.match(/Address[:\s]+([^\n]+(?:\n[^\n]+)*)/i);

  // Extract items table
  const itemsPattern = /(\d+)\s+x\s+(.+?)(?=\d+\s+x|\s*$)/g;
  const items: Array<{ name: string; qty: number }> = [];
  let match;

  while ((match = itemsPattern.exec(text)) !== null) {
    const qty = parseInt(match[1], 10);
    const name = match[2].trim();
    items.push({ name, qty });
  }

  // Derive categories for each product
  const derivedCategories = items.map(item => {
    // First try direct lookup
    let category = CATEGORY_LOOKUP[item.name];
    
    // If no match, try normalized comparison
    if (!category) {
      const itemNameLower = item.name.toLowerCase().trim();
      const matchedKey = Object.keys(CATEGORY_LOOKUP).find(k => {
        const keyLower = k.toLowerCase().trim();
        
        // Try exact match first
        if (itemNameLower === keyLower) {
          return true;
        }
        
        // Try partial matches
        const itemWords = itemNameLower.split(/\s+/);
        const keyWords = keyLower.split(/\s+/);
        
        // Check if all words in either string are contained in the other
        const itemContainsKey = keyWords.every(word => itemNameLower.includes(word));
        const keyContainsItem = itemWords.every(word => keyLower.includes(word));
        
        return itemContainsKey || keyContainsItem;
      });
      
      if (matchedKey) {
        category = CATEGORY_LOOKUP[matchedKey];
      }
    }

    return {
      product: item.name,
      category: category?.sheet || null
    };
  });

  return {
    orderId: orderIdMatch?.[1] || 'Unknown',
    orderDate: orderDateMatch?.[1] || 'Unknown',
    customer: {
      name: customerNameMatch?.[1] || 'Unknown',
      address: addressMatch?.[1]?.replace(/\n/g, ', ') || 'Unknown',
      region: 'Unknown' // TODO: Implement region extraction for TypeScript version
    },
    items,
    pdfBlobUrl,
    derivedCategories
  };
}

export async function parseMultiplePDFs(files: File[]): Promise<ParsedOrder[]> {
  const orders = await Promise.all(files.map(file => parsePDF(file)));
  return orders;
}

// Helper function to group orders by category
export function groupByCategory(orders: ParsedOrder[]): Record<string, number> {
  const categoryTotals: Record<string, number> = {};

  orders.forEach(order => {
    order.items.forEach((item, index) => {
      const category = order.derivedCategories[index]?.category || 'Uncategorized';
      categoryTotals[category] = (categoryTotals[category] || 0) + item.qty;
    });
  });

  return categoryTotals;
}

// Helper function to group orders by product
export function groupByProduct(orders: ParsedOrder[]): Record<string, number> {
  const productTotals: Record<string, number> = {};

  orders.forEach(order => {
    order.items.forEach(item => {
      productTotals[item.name] = (productTotals[item.name] || 0) + item.qty;
    });
  });

  return productTotals;
}

// Helper function to filter orders by date range
export function filterByDateRange(
  orders: ParsedOrder[],
  startDate: string,
  endDate: string
): ParsedOrder[] {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return orders.filter(order => {
    const orderDate = new Date(order.orderDate);
    return orderDate >= start && orderDate <= end;
  });
}

// Helper function to filter orders by customer
export function filterByCustomer(
  orders: ParsedOrder[],
  customerName: string
): ParsedOrder[] {
  const normalizedName = customerName.toLowerCase();
  return orders.filter(order => 
    order.customer.name.toLowerCase().includes(normalizedName)
  );
}

// Helper function to filter orders by product
export function filterByProduct(
  orders: ParsedOrder[],
  productName: string
): ParsedOrder[] {
  const normalizedName = productName.toLowerCase();
  return orders.filter(order =>
    order.items.some(item => 
      item.name.toLowerCase().includes(normalizedName)
    )
  );
}

// Helper function to filter orders by category
export function filterByCategory(
  orders: ParsedOrder[],
  category: string
): ParsedOrder[] {
  const normalizedCategory = category.toLowerCase();
  return orders.filter(order =>
    order.derivedCategories.some(cat => 
      cat.category?.toLowerCase() === normalizedCategory
    )
  );
} 