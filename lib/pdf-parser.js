import { CATEGORY_LOOKUP } from './category-lookup.js';

// Initialize pdf.js worker
const pdfJsVersion = '3.11.174';  // Use a specific version for stability
const pdfJsWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfJsVersion}/pdf.worker.min.js`;

// Ensure pdfjsLib is available
if (typeof pdfjsLib === 'undefined') {
    throw new Error('PDF.js library not loaded');
}

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfJsWorkerSrc;

// Helper function to extract items from text
function extractItems(text) {
    console.log('=== Starting item extraction ===');
    
    const items = [];
    
    // First, find where the items section starts and ends
    const itemsStart = text.indexOf('ITEMS');
    if (itemsStart === -1) {
        console.log('No ITEMS section found');
        return [];
    }

    // Find the end of the items section (either at NOTES or end of text)
    const notesStart = text.indexOf('NOTES', itemsStart);
    const itemsSection = notesStart !== -1 
        ? text.substring(itemsStart, notesStart)
        : text.substring(itemsStart);
    
    console.log('Items section:', itemsSection);
    
    // Split into lines and clean them
    const lines = itemsSection.split(/[\n\r]+/)
        .map(line => line.trim())
        .filter(line => {
            // Skip empty lines and headers
            if (!line || /^(?:ITEMS|QUANTITY|NOTES|TOTAL)$/i.test(line)) {
                return false;
            }
            // Skip lines that are clearly not items
            if (/^(?:Order|Date|Customer|Address|Phone|Email|Thank you)/i.test(line)) {
                return false;
            }
            return true;
        });
    
    console.log('Processed lines:', lines);

    // Process lines in groups of three (product, portion, quantity)
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        console.log('\nProcessing line:', line);

        // Skip the header line
        if (line.includes('ITEMS') && line.includes('QUANTITY')) {
            continue;
        }

        // Handle combined items (with &)
        if (line.includes('&')) {
            const parts = line.split('&').map(part => part.trim());
            
            // Get the quantity from the next "X of Y" line
            let j = i + 1;
            let quantityLine = '';
            while (j < lines.length) {
                if (lines[j].match(/\d+\s+of\s+\d+/)) {
                    quantityLine = lines[j];
                    break;
                }
                j++;
            }
            
            const quantityMatch = quantityLine.match(/(\d+)\s+of\s+\d+/);
            const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : 1;

            parts.forEach(part => {
                // Extract weight from parentheses at the end of the part
                const weightMatch = part.match(/\s*\((\d+(?:\s*-\s*\d+)?(?:g|gm|kg))\)$/i);
                const portionSize = weightMatch ? weightMatch[1] : '';
                
                // Remove only the portion size parentheses from the end, preserve other parentheses
                const name = weightMatch ? part.slice(0, part.lastIndexOf('(')).trim() : part.trim();
                
                if (name) {
                    items.push({
                        name: name,
                        portionSize: portionSize,
                        qty: quantity
                    });
                }
            });
            
            // Skip the next lines that were part of this item
            while (i < lines.length - 1 && !lines[i + 1].includes('&') && !lines[i + 1].match(/^[A-Za-z]/)) {
                i++;
            }
            continue;
        }

        // Handle regular items
        if (line.match(/^[A-Za-z]/)) {  // Line starts with a letter (product name)
            let name = line;
            let portionSize = '';
            let quantity = 1;

            // Look for portion size in the next lines
            let j = i + 1;
            while (j < lines.length) {
                const nextLine = lines[j];
                
                // If we hit another product name, break
                if (nextLine.match(/^[A-Za-z]/)) {
                    break;
                }
                
                // Check for portion size - expanded to include more units
                if (nextLine.match(/^\d+(?:\s*-\s*\d+)?\s*(?:g|gm|kg|pc|pcs?|ml|ML|Lt|Litre|Liter|Packet|Pkt|Pack)/i) || 
                    nextLine.match(/^\(\d+(?:\s*-\s*\d+)?\s*(?:g|gm|kg|pc|pcs?|ml|ML|Lt|Litre|Liter|Packet|Pkt|Pack)\)/i)) {
                    portionSize = nextLine.replace(/[()]/g, '').trim();
                }
                
                // Check for quantity
                const quantityMatch = nextLine.match(/(\d+)\s+of\s+\d+/);
                if (quantityMatch) {
                    quantity = parseInt(quantityMatch[1], 10);
                    break;
                }
                
                j++;
            }

            // Extract any portion size that might be in the name at the end
            const namePortionMatch = name.match(/\s+(\d+(?:\s*-\s*\d+)?\s*(?:g|gm|kg|pc|pcs?|ml|ML|Lt|Litre|Liter|Packet|Pkt|Pack))\s*$/i);
            if (namePortionMatch && !portionSize) {
                portionSize = namePortionMatch[1];
                name = name.slice(0, name.lastIndexOf(namePortionMatch[0])).trim();
            }

            // Extract portion size in parentheses at the end
            const namePortionParenMatch = name.match(/\s*\((\d+(?:\s*-\s*\d+)?(?:g|gm|kg|pc|pcs?|ml|ML|Lt|Litre|Liter|Packet|Pkt|Pack))\)$/i);
            if (namePortionParenMatch && !portionSize) {
                portionSize = namePortionParenMatch[1];
                name = name.slice(0, name.lastIndexOf('(')).trim();
            }

            // Extract portion size from descriptive parentheses
            const descriptivePortionMatch = name.match(/\s*\(([^)]*(?:\d+\s*(?:g|gm|kg|pc|pcs?|ml|ML|Lt|Litre|Liter|Packet|Pkt|Pack))[^)]*)\)$/i);
            if (descriptivePortionMatch && !portionSize) {
                const desc = descriptivePortionMatch[1];
                const unitMatch = desc.match(/(\d+(?:\s*-\s*\d+)?\s*(?:g|gm|kg|pc|pcs?|ml|ML|Lt|Litre|Liter|Packet|Pkt|Pack))/i);
                if (unitMatch) {
                    portionSize = unitMatch[1];
                    // Keep the descriptive text in the name
                    name = name.replace(/\s*\([^)]*\)$/, '').trim() + ' (' + desc.replace(unitMatch[0], '').trim() + ')';
                }
            }
            
            if (name) {
                items.push({
                    name: name,
                    portionSize: portionSize,
                    qty: quantity
                });
            }

            // Skip the lines we've processed
            i = j;
        }
    }
    
    console.log('=== Final extracted items ===', items);
    return items;
}

// Helper function to clean item names
function cleanItemName(name) {
    if (!name) return '';
    
    console.log('Cleaning name:', name);
    
    // Remove quantity-related text - expanded to include more units
    let cleaned = name.replace(/\d+\s*(?:Pcs?|Gm|g\b|of\s+\d+|ml|ML|Lt|Litre|Liter|Packet|Pkt|Pack)/gi, '');
    
    // Clean up parenthetical descriptions while keeping important product info
    cleaned = cleaned
        // Remove measurement-related parentheses - expanded to include more units
        .replace(/\((?:After cleaning[^)]*|approx\.?[^)]*|about[^)]*|around[^)]*|\d+(?:g|gm|kg|ml|ML|Lt|Litre|Liter|Packet|Pkt|Pack)[^)]*)\)/gi, '')
        // Keep product info in parentheses
        .replace(/\(([^)]+)\)/g, '$1')
        // Clean up extra spaces and punctuation
        .replace(/\s*[,\/]\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    console.log('Final cleaned name:', cleaned);
    return cleaned;
}

// Main PDF parsing function
export async function parsePDF(file) {
    try {
        console.log('\n=== Starting PDF parsing ===');
        console.log('File name:', file.name);
        
        // Create blob URL for reference
        const pdfBlobUrl = URL.createObjectURL(file);
        
        // Load the PDF document
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        console.log('PDF loaded, pages:', pdf.numPages);
        
        // Get all pages
        const numPages = pdf.numPages;
        let fullText = '';
        
        // Extract text from all pages
        for (let i = 1; i <= numPages; i++) {
            console.log('Processing page:', i);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Join text items with proper spacing
            let lastY;
            let pageText = '';
            let lineTexts = [];
            
            // First, group items by their Y position
            textContent.items.forEach(item => {
                const y = Math.round(item.transform[5]);
                if (lastY !== y && lineTexts.length > 0) {
                    pageText += lineTexts.join(' ') + '\n';
                    lineTexts = [];
                }
                lineTexts.push(item.str);
                lastY = y;
            });
            
            // Add the last line
            if (lineTexts.length > 0) {
                pageText += lineTexts.join(' ') + '\n';
            }
            
            console.log('Page text:', pageText);
            fullText += pageText;
        }

        console.log('Full extracted text:', fullText);

        // Extract order details using regex patterns
        const orderIdMatch = file.name.match(/SSH\d+/);
        const orderDateMatch = file.name.match(/(\d{2}\.\d{2}\.\d{4})/);
        const customerNameMatch = file.name.match(/SSH\d+_\s*(.+?)_\d{2}\.\d{2}\.\d{4}/);

        // Extract items
        const items = extractItems(fullText);
        console.log('Extracted items:', items);

        // Derive categories for each product
        const derivedCategories = items.map(item => {
            // Clean the item name for lookup
            const cleanedName = cleanItemName(item.name);
            console.log('Looking up category for:', cleanedName);
            
            // First try direct lookup with cleaned name
            let category = CATEGORY_LOOKUP[cleanedName];
            
            // Then try with original name
            if (!category) {
                category = CATEGORY_LOOKUP[item.name];
            }
            
            // If still no match, try normalized comparison
            if (!category) {
                const itemNameLower = cleanedName.toLowerCase().trim();
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
            
            console.log('Category found:', category);
            
            return {
                product: item.name,
                category: category?.sheet || 'Uncategorized'
            };
        });

        console.log('Derived categories:', derivedCategories);

        // Extract address - look for multiple patterns
        const addressPatterns = [
            /(?:Address|Delivery Address|Ship To|BILL TO)[:\s]+([^\n]+(?:\n[^\n]+)*?)(?=\s*(?:ITEMS|NOTES|$))/i,
            /BILL TO\s+([^\n]+(?:\n[^I]+)?)(?=\s*ITEMS)/i
        ];

        let address = 'Unknown';
        for (const pattern of addressPatterns) {
            const match = fullText.match(pattern);
            if (match && match[1]) {
                address = match[1].replace(/\n/g, ', ').replace(/\s+/g, ' ').trim();
                break;
            }
        }

        const result = {
            orderId: orderIdMatch?.[0] || 'Unknown',
            orderDate: orderDateMatch?.[1]?.replace(/\./g, '-') || 'Unknown',
            customer: {
                name: customerNameMatch?.[1]?.trim() || 'Unknown',
                address: address
            },
            items,
            pdfBlobUrl,
            derivedCategories
        };

        console.log('=== Final parsed result ===', result);
        return result;
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw error;
    }
}

export async function parseMultiplePDFs(files) {
  const orders = await Promise.all(files.map(file => parsePDF(file)));
  return orders;
}

// Helper function to group orders by category
export function groupByCategory(orders) {
  const categoryTotals = {};

  if (!Array.isArray(orders)) return categoryTotals;

  orders.forEach(order => {
    if (!Array.isArray(order?.items)) return;
    
    order.items.forEach((item, index) => {
      if (!item?.name || !item?.qty) return;
      
      const category = order.derivedCategories?.[index]?.category || 'Uncategorized';
      if (!categoryTotals[category]) {
        categoryTotals[category] = {
          products: new Set(),
          totalQty: 0,
          details: []
        };
      }
      categoryTotals[category].products.add(item.name);
      categoryTotals[category].totalQty += item.qty;
      categoryTotals[category].details.push(`${item.name} (${item.qty} units)`);
    });
  });

  // If no categories were found, add an empty "Uncategorized" category
  if (Object.keys(categoryTotals).length === 0) {
    categoryTotals['Uncategorized'] = {
      products: new Set(),
      totalQty: 0,
      details: []
    };
  }

  return categoryTotals;
}

// Helper function to group orders by product
export function groupByProduct(orders) {
  const productTotals = {};

  if (!Array.isArray(orders)) return productTotals;

  orders.forEach(order => {
    if (!Array.isArray(order?.items)) return;
    
    order.items.forEach(item => {
      if (!item?.name || !item?.qty) return;
      productTotals[item.name] = (productTotals[item.name] || 0) + item.qty;
    });
  });

  return productTotals;
}

// Helper function to filter orders by date range
export function filterByDateRange(orders, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return orders.filter(order => {
    const orderDate = new Date(order.orderDate);
    return orderDate >= start && orderDate <= end;
  });
}

// Helper function to filter orders by customer
export function filterByCustomer(orders, customerName) {
  const normalizedName = customerName.toLowerCase();
  return orders.filter(order => 
    order.customer.name.toLowerCase().includes(normalizedName)
  );
}

// Helper function to filter orders by product
export function filterByProduct(orders, productName) {
  const normalizedName = productName.toLowerCase();
  return orders.filter(order =>
    order.items.some(item => 
      item.name.toLowerCase().includes(normalizedName)
    )
  );
}

// Helper function to filter orders by category
export function filterByCategory(orders, category) {
    const normalizedCategory = category.toLowerCase();
    return orders.map(order => {
        // Create a new order object with filtered items
        const filteredItems = order.items.filter((item, index) => {
            const itemCategory = order.derivedCategories[index]?.category?.toLowerCase();
            return itemCategory === normalizedCategory;
        });

        // Only include matching categories in derivedCategories
        const filteredCategories = order.derivedCategories.filter((cat) => 
            cat.category?.toLowerCase() === normalizedCategory
        );

        // If this order has any matching items, return a modified order
        if (filteredItems.length > 0) {
            return {
                ...order,
                items: filteredItems,
                derivedCategories: filteredCategories
            };
        }
        // If no items match, return null
        return null;
    }).filter(Boolean); // Remove null orders
} 