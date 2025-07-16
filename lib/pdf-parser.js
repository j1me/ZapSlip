// PDF Parser v2.2 - Simplified multi-line product parsing
// Last updated: Fix for reliable 1-2 line product name parsing
import { CATEGORY_LOOKUP, getCategoryInfo, initializeLookup, getAllKnownProductNames, findBestProductMatch } from './category-lookup.js';

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
            // Skip combined header patterns like "ITEMS QUANTITY"
            if (/^(?:ITEMS\s+QUANTITY|QUANTITY\s+ITEMS)$/i.test(line)) {
                return false;
            }
            // Skip lines that are clearly not items
            if (/^(?:Order|Date|Customer|Address|Phone|Email|Thank you)/i.test(line)) {
                return false;
            }
            // Skip lines that are just headers or column names
            if (/^(?:Product|Item|Name|Description|Qty|Price|Amount|Total)$/i.test(line)) {
                return false;
            }
            return true;
        });
    
    console.log('Processed lines:', lines);

    // Helper function to check if a line is a portion size - IMPROVED
    function isPortionSize(line) {
        // More flexible portion size matching
        const portionPatterns = [
            /^\d+(?:\s*-\s*\d+)?\s*(?:g|gm|Gm|kg|pc|pcs?|ml|ML|Lt|Litre|Liter|Packet|Pkt|Pack)\s*$/i,
            /^\d+(?:\s*-\s*\d+)?\s*(?:g|gm|Gm|kg|pc|pcs?|ml|ML|Lt|Litre|Liter|Packet|Pkt|Pack)\s+.{0,20}$/i, // Allow some extra text after portion
            /^.{0,10}\s*\d+(?:\s*-\s*\d+)?\s*(?:g|gm|Gm|kg|pc|pcs?|ml|ML|Lt|Litre|Liter|Packet|Pkt|Pack)\s*$/i, // Allow some text before portion
        ];
        
        const result = portionPatterns.some(pattern => pattern.test(line));
        if (result) {
            console.log(`    → "${line}" identified as portion size`);
        }
        return result;
    }

    // Helper function to check if a line is a quantity
    function isQuantity(line) {
        // Matches "X of Y" pattern
        const result = /^\d+\s+of\s+\d+$/.test(line);
        if (result) {
            console.log(`    → "${line}" identified as quantity`);
        }
        return result;
    }

    // Helper function to check if a line looks like a product name start
    function looksLikeProductName(line) {
        // Product names typically start with a capital letter and contain actual words
        const basicCheck = /^[A-Z]/.test(line) && 
               line.length > 3 && 
               !isPortionSize(line) && 
               !isQuantity(line) &&
               !/^\d+$/.test(line); // Not just a number
        
        if (!basicCheck) {
            return false;
        }
        
        // Additional checks to reject header-like patterns
        const headerPatterns = [
            /^ITEMS\s+QUANTITY/i,
            /^QUANTITY\s+ITEMS/i,
            /^(?:ITEMS|QUANTITY|NOTES|TOTAL|ORDER|DATE|CUSTOMER|ADDRESS|PHONE|EMAIL)$/i,
            /^(?:Product|Item|Name|Description|Qty|Price|Amount|Total)$/i
        ];
        
        const isHeader = headerPatterns.some(pattern => pattern.test(line));
        if (isHeader) {
            console.log(`    → "${line}" rejected as header pattern`);
            return false;
        }
        
        const result = true;
        if (result) {
            console.log(`    → "${line}" looks like product name`);
        }
        return result;
    }

    // Helper function to check if a line could be a continuation of product name
    function couldBeProductContinuation(line, previousLine) {
        // More lenient continuation check
        if (!line || line.length < 2) return false;
        if (isPortionSize(line) || isQuantity(line)) return false;
        
        // Check if it looks like a natural continuation
        const continuationIndicators = [
            /^[a-z]/, // Starts with lowercase (likely continuation)
            /^\(/, // Starts with parenthesis (description)
            /^-/, // Starts with dash (continuation)
            /^For\s+\d+/i, // "For X People" pattern
            /^\w+\s*\)/, // Ends with closing parenthesis
        ];
        
        const hasIndicator = continuationIndicators.some(pattern => pattern.test(line));
        
        // Also check if previous line ends in a way that suggests continuation
        const previousEndsIncomplete = previousLine && (
            previousLine.endsWith('-') ||
            previousLine.endsWith('(') ||
            previousLine.match(/\w\s*$/) // Ends with word character
        );
        
        return hasIndicator || previousEndsIncomplete;
    }

    // New improved parsing approach
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        console.log(`\n[${i}] Processing: "${line}"`);
        
        // Skip if this doesn't look like a product name
        if (!looksLikeProductName(line)) {
            console.log(`  → Skipping: doesn't look like product name`);
            i++;
            continue;
        }

        let productName = line;
        let portionSize = '';
        let quantity = 1;
        let nextIndex = i + 1;

        console.log(`  → Starting product: "${productName}"`);

        // Look ahead to understand the pattern better
        const lookAhead = [];
        for (let j = nextIndex; j < Math.min(nextIndex + 4, lines.length); j++) {
            lookAhead.push(lines[j]);
        }
        console.log(`  → Look ahead lines: [${lookAhead.map(l => `"${l}"`).join(', ')}]`);

        // Check if next line could be part of product name
        while (nextIndex < lines.length) {
            const nextLine = lines[nextIndex];
            console.log(`  → Examining line [${nextIndex}]: "${nextLine}"`);
            
            // If it's clearly portion or quantity, stop looking for name continuation
            if (isPortionSize(nextLine)) {
                console.log(`    → Found portion size, stopping name combination`);
                break;
            }
            if (isQuantity(nextLine)) {
                console.log(`    → Found quantity, stopping name combination`);
                break;
            }
            
            // Check if this could be a continuation of the product name
            if (couldBeProductContinuation(nextLine, productName)) {
                console.log(`    → Adding to product name: "${nextLine}"`);
                productName += ' ' + nextLine;
                nextIndex++;
                continue;
            }
            
            // Check if combining would match a known product
            const combinedName = productName + ' ' + nextLine;
            const knownMatch = findBestProductMatch(combinedName);
            
            if (knownMatch) {
                console.log(`    → Found known product match: "${knownMatch}"`);
                productName = knownMatch;
                nextIndex++;
                break;
            }
            
            // Look ahead to see if we have a clear pattern after this line
            const afterThis = nextIndex + 1 < lines.length ? lines[nextIndex + 1] : '';
            const afterThat = nextIndex + 2 < lines.length ? lines[nextIndex + 2] : '';
            
            if (isPortionSize(afterThis) || isQuantity(afterThis) || isQuantity(afterThat)) {
                console.log(`    → Found pattern ahead, adding line to name`);
                productName += ' ' + nextLine;
                nextIndex++;
                break;
            }
            
            // If next line looks like a new product, stop
            if (looksLikeProductName(nextLine) && !couldBeProductContinuation(nextLine, productName)) {
                console.log(`    → Next line looks like new product, stopping`);
                break;
            }
            
            // Default: if we're uncertain, add one more line and stop
            console.log(`    → Default: adding one more line and stopping`);
            productName += ' ' + nextLine;
            nextIndex++;
            break;
        }

        // Now look for portion size in the next few lines
        let foundPortion = false;
        for (let j = nextIndex; j < Math.min(nextIndex + 3, lines.length); j++) {
            if (isPortionSize(lines[j])) {
                portionSize = lines[j];
                console.log(`  → Found portion at [${j}]: "${portionSize}"`);
                nextIndex = j + 1;
                foundPortion = true;
                break;
            }
        }

        // Now look for quantity
        if (foundPortion && nextIndex < lines.length && isQuantity(lines[nextIndex])) {
            const qtyMatch = lines[nextIndex].match(/^(\d+)\s+of\s+\d+$/);
            if (qtyMatch) {
                quantity = parseInt(qtyMatch[1], 10);
                console.log(`  → Found quantity at [${nextIndex}]: ${quantity}`);
                nextIndex++;
            }
        } else if (!foundPortion) {
            // If no portion found, look for quantity without portion
            for (let j = nextIndex; j < Math.min(nextIndex + 3, lines.length); j++) {
                if (isQuantity(lines[j])) {
                    const qtyMatch = lines[j].match(/^(\d+)\s+of\s+\d+$/);
                    if (qtyMatch) {
                        quantity = parseInt(qtyMatch[1], 10);
                        console.log(`  → Found quantity without portion at [${j}]: ${quantity}`);
                        nextIndex = j + 1;
                        break;
                    }
                }
            }
        }

        // Add the item
        if (productName.trim()) {
            console.log(`  ✅ Final product: "${productName}", portion: "${portionSize}", qty: ${quantity}`);
            items.push({
                name: productName.trim(),
                portionSize: portionSize,
                qty: quantity
            });
        }

        // Move to next unprocessed line
        i = nextIndex;
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
    
    // DO NOT remove "For X People" patterns - these are part of the product name
    
    // Clean up parenthetical descriptions while keeping important product info
    cleaned = cleaned
        // Remove measurement-related parentheses - expanded to include more units
        .replace(/\((?:After cleaning[^)]*|approx\.?[^)]*|about[^)]*|around[^)]*|\d+(?:g|gm|Gm|kg|ml|ML|Lt|Litre|Liter|Packet|Pkt|Pack)[^)]*)\)/gi, '')
        // Keep important product info including "For X People" descriptions
        .replace(/\(([^)]+)\)/g, (match, content) => {
            // If the parentheses contain only measurements, remove them
            if (/^\s*\d+(?:g|gm|Gm|kg|ml|ML|Lt|Litre|Liter|Packet|Pkt|Pack)\s*$/i.test(content)) {
                return '';
            }
            // Otherwise, keep the content but remove the parentheses (including "For X People")
            return ' ' + content;
        })
        // Clean up extra spaces and punctuation
        .replace(/\s*[,\/]\s*/g, ' ')
        .replace(/\s+/g, ' ')
        // Remove trailing dashes
        .replace(/\s*-\s*$/, '')
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
            
            // First try direct lookup with cleaned name using new dynamic function
            let category = getCategoryInfo(cleanedName);
            
            // Then try with original name
            if (!category) {
                category = getCategoryInfo(item.name);
            }
            
            // If still no match, try normalized comparison with both dynamic and static lookups
            if (!category) {
                const itemNameLower = cleanedName.toLowerCase().trim();
                
                // Try to find a match in the combined lookup (Google Sheets + static fallback)
                // This searches through both DYNAMIC_CATEGORY_LOOKUP and CATEGORY_LOOKUP
                const allKeys = [
                    ...Object.keys(CATEGORY_LOOKUP),
                    // Note: DYNAMIC_CATEGORY_LOOKUP keys will be checked by getCategoryInfo
                ];
                
                const matchedKey = allKeys.find(k => {
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
                    category = getCategoryInfo(matchedKey);
                }
            }
            
            console.log('Category found:', category);
            
            return {
                product: item.name,
                category: category?.sheet || 'Uncategorized'
            };
        });

        console.log('Derived categories:', derivedCategories);

        // Enhanced address parsing function
        function parseAddressAndRegion(fullText) {
            const addressPatterns = [
                /(?:Address|Delivery Address|Ship To|BILL TO)[:\s]+([^\n]+(?:\n[^\n]+)*?)(?=\s*(?:ITEMS|NOTES|$))/i,
                /BILL TO\s+([^\n]+(?:\n[^I]+)?)(?=\s*ITEMS)/i
            ];

            let rawAddress = 'Unknown';
            for (const pattern of addressPatterns) {
                const match = fullText.match(pattern);
                if (match && match[1]) {
                    rawAddress = match[1].replace(/\n/g, ', ').replace(/\s+/g, ' ').trim();
                    break;
                }
            }

            // If we have a combined shipping/billing address, try to split it
            if (rawAddress.includes('BILL TO')) {
                // Extract everything after "BILL TO" as the primary address
                const billToMatch = rawAddress.match(/BILL TO[,\s]*(.+)/i);
                if (billToMatch) {
                    rawAddress = billToMatch[1].trim();
                }
            }

            // Extract region from address
            // Pattern: after coordinates and pincode, extract the region
            // Example: "28.580858, 77.245995, 110014 South East Delhi DL, India"
            let region = '';
            let cleanAddress = rawAddress;

            // Look for pattern: coordinates, pincode, then region
            const regionMatch = rawAddress.match(/\d+\.\d+,\s*\d+\.\d+,\s*(\d{6})\s+(.+?)(?:,\s*\+\d+|$)/);
            if (regionMatch) {
                const pincode = regionMatch[1];
                region = regionMatch[2].trim();
                
                // Clean the address by removing coordinates and duplicated region info
                cleanAddress = rawAddress
                    .replace(/\d+\.\d+,\s*\d+\.\d+,\s*/, '') // Remove coordinates
                    .replace(/,\s*\+\d+[\d\s]*/, '') // Remove phone number
                    .trim();
                
                // If region appears twice, remove the duplicate
                const regionParts = region.split(',');
                if (regionParts.length > 1) {
                    region = regionParts[0].trim(); // Take first part as main region
                }
            }

            // Fallback: look for region after any 6-digit pincode
            if (!region) {
                const fallbackMatch = rawAddress.match(/(\d{6})\s+([^,]+)/);
                if (fallbackMatch) {
                    region = fallbackMatch[2].trim();
                }
            }

            return {
                address: cleanAddress,
                region: region || 'Unknown'
            };
        }

        // Extract address and region
        const addressInfo = parseAddressAndRegion(fullText);

        const result = {
            orderId: orderIdMatch?.[0] || 'Unknown',
            orderDate: orderDateMatch?.[1]?.replace(/\./g, '-') || 'Unknown',
            customer: {
                name: customerNameMatch?.[1]?.trim() || 'Unknown',
                address: addressInfo.address,
                region: addressInfo.region
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