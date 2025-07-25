/**
 * Normalizes a product name by standardizing portion sizes and removing variations
 * @param {string} name Product name to normalize
 * @returns {string} Normalized product name
 */
export function normalizeProductName(name) {
  // Remove/standardize portion sizes (ml, ML, Lt, LT, g, gm, GM, kg, KG, Kg)
  return name.replace(/\s*\d+\s*(ml|ML|Lt|LT|g|gm|GM|kg|KG|Kg)\b/g, '')
            .replace(/\(\s*\)/g, '') // Remove empty parentheses
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
}

// Google Sheets CSV URL for the lookup table
const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/1WpQGDlmLcBbfIsk9Yehwr2snozVll1swa22eOBiMhnM/export?format=csv&gid=0';

// Dynamic category lookup - will be populated from Google Sheets
let DYNAMIC_CATEGORY_LOOKUP = {};

/**
 * Fetches and parses CSV data from Google Sheets
 * @returns {Promise<Object>} Parsed lookup object
 */
async function fetchGoogleSheetsLookup() {
  try {
    console.log('Fetching lookup data from Google Sheets...');
    const response = await fetch(GOOGLE_SHEETS_CSV_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    return parseCSVToLookup(csvText);
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error);
    return {};
  }
}

/**
 * Parses CSV text into lookup object
 * @param {string} csvText Raw CSV data
 * @returns {Object} Parsed lookup object
 */
function parseCSVToLookup(csvText) {
  const lookup = {};
  const lines = csvText.split('\n');
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handle quoted values)
    const columns = parseCSVLine(line);
    
    if (columns.length >= 3) {
      const [title, sheet, type, status] = columns;
      
      // Only include active products (default to active if no status column)
      if (!status || status.toLowerCase() === 'active') {
        lookup[title] = {
          sheet: sheet,
          type: type || null
        };
      }
    }
  }
  
  console.log(`Loaded ${Object.keys(lookup).length} products from Google Sheets`);
  return lookup;
}

/**
 * Simple CSV line parser that handles quoted values
 * @param {string} line CSV line
 * @returns {Array<string>} Parsed columns
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Initializes the dynamic lookup by fetching from Google Sheets
 * @returns {Promise<void>}
 */
export async function initializeLookup() {
  DYNAMIC_CATEGORY_LOOKUP = await fetchGoogleSheetsLookup();
}

/**
 * Gets category info for a product, checking Google Sheets first, then fallback
 * @param {string} productName Product name to lookup
 * @returns {Object|null} Category info or null if not found
 */
export function getCategoryInfo(productName) {
  // First check dynamic lookup (Google Sheets)
  if (DYNAMIC_CATEGORY_LOOKUP[productName]) {
    return DYNAMIC_CATEGORY_LOOKUP[productName];
  }
  
  // Fallback to static lookup
  if (CATEGORY_LOOKUP[productName]) {
    return CATEGORY_LOOKUP[productName];
  }
  
  return null;
}

/**
 * Gets all known product names from both Google Sheets and static lookup
 * @returns {string[]} Array of all known product names
 */
export function getAllKnownProductNames() {
  const dynamicNames = Object.keys(DYNAMIC_CATEGORY_LOOKUP);
  const staticNames = Object.keys(CATEGORY_LOOKUP);
  
  console.log(`📊 Dynamic products from Google Sheets: ${dynamicNames.length}`);
  console.log(`📊 Static fallback products: ${staticNames.length}`);
  
  // Show first few dynamic products for debugging
  if (dynamicNames.length > 0) {
    console.log(`🔤 First 5 Google Sheets products:`);
    dynamicNames.slice(0, 5).forEach(name => {
      console.log(`   - "${name}"`);
    });
  } else {
    console.log(`⚠️ No products loaded from Google Sheets!`);
  }
  
  // Combine and deduplicate
  const allNames = [...new Set([...dynamicNames, ...staticNames])];
  console.log(`📋 Total known products: ${allNames.length}`);
  return allNames;
}

/**
 * Finds the best matching product name from known products
 * @param {string} partialName Partial or incomplete product name
 * @returns {string|null} Best matching complete product name or null
 */
export function findBestProductMatch(partialName) {
  const allKnownNames = getAllKnownProductNames();
  const partialLower = partialName.toLowerCase().trim();
  
  console.log(`🔍 Searching for match to: "${partialName}"`);
  console.log(`📋 Total known products: ${allKnownNames.length}`);
  
  // First try exact match
  const exactMatch = allKnownNames.find(name => 
    name.toLowerCase().trim() === partialLower
  );
  if (exactMatch) {
    console.log(`✅ Found exact match: "${exactMatch}"`);
    return exactMatch;
  }
  
  // Then try to find products that start with the partial name
  const startsWithMatch = allKnownNames.find(name => 
    name.toLowerCase().startsWith(partialLower)
  );
  if (startsWithMatch) {
    console.log(`✅ Found starts-with match: "${startsWithMatch}"`);
    return startsWithMatch;
  }
  
  // Then try to find products that contain all words from the partial name
  const partialWords = partialLower.split(/\s+/).filter(w => w.length > 2);
  console.log(`🔤 Searching with words: ${partialWords.join(', ')}`);
  
  const containsAllWords = allKnownNames.find(name => {
    const nameLower = name.toLowerCase();
    const matches = partialWords.every(word => nameLower.includes(word));
    if (matches) {
      console.log(`🎯 Found word-match candidate: "${name}"`);
    }
    return matches;
  });
  
  if (containsAllWords) {
    console.log(`✅ Found contains-all-words match: "${containsAllWords}"`);
    return containsAllWords;
  }
  
  // Debug: Show some examples of what we have
  console.log(`❌ No match found. Here are some examples of known products:`);
  allKnownNames.slice(0, 10).forEach(name => {
    console.log(`   - "${name}"`);
  });
  
  return null;
}

// Fallback static lookup (your existing data as backup)
export const CATEGORY_LOOKUP = {
  "Agarbathi Brass Stand Small": { type: "PACKED", sheet: "FRESHITEM" },
  "Thattam Medium (Brass Plate)": { type: "PACKED", sheet: "FRESHITEM" },
  "Para Brass Small (Rice Measuring Vessel)": { type: "PACKED", sheet: "FRESHITEM" },
  "Kindi Brass Small (Traditional Water Pot)": { type: "PACKED", sheet: "FRESHITEM" },
  "Vilakku Small (Brass Lamp)": { type: "PACKED", sheet: "FRESHITEM" },
  "Ponnada (Shawl)": { type: "PACKED", sheet: "FRESHITEM" },
  "Melvesthi  / Naaree / Aag Vasthram - 2 Inch": { type: "PACKED", sheet: "FRESHITEM" },
  "999 Kara Mund - Double Dhotie (KPR Mills)": { type: "PACKED", sheet: "FRESHITEM" },
  "Kasavu Sandal Double Mund (SMA Brand)": { type: "PACKED", sheet: "FRESHITEM" },
  "Kerala Thorth Big (30*60)": { type: "PACKED", sheet: "FRESHITEM" },
  "Biryani Essence (Bush)": { type: "PACKED", sheet: "FRESHITEM" },
  "SAS Banana Plastic Leaf": { type: "PACKED", sheet: "FRESHITEM" },
  "Sev Maker - Brass (Richlin)": { type: "PACKED", sheet: "FRESHITEM" },
  "Rice Kalam No. 4 with Lid": { type: "PACKED", sheet: "FRESHITEM" },
  "Rice Kalam No. 3 with Lid": { type: "PACKED", sheet: "FRESHITEM" },
  "Common Cook 3/1 (Sun Brand Kairali)": { type: "PACKED", sheet: "FRESHITEM" },
  "Cheratta Puttu Maker Big (Sun Brand Kairali)": { type: "PACKED", sheet: "FRESHITEM" },
  "Pressure Puttu Maker (Sun Brand Kairali)": { type: "PACKED", sheet: "FRESHITEM" },
  "Puttu Kodam Big Gold  - Joint Free (Sun Brand Kairali)": { type: "PACKED", sheet: "FRESHITEM" },
  "Applam (Aachi)": { type: "PACKED", sheet: "FRESHITEM" },
  "Pickle Powder (Eastern)": { type: "PACKED", sheet: "FRESHITEM" },
  "Turmeric Powder (Eastern)": { type: "PACKED", sheet: "FRESHITEM" },
  "Sambar Powder (Eastern)": { type: "PACKED", sheet: "FRESHITEM" },
  "Black Pepper Powder (Eastern)": { type: "PACKED", sheet: "FRESHITEM" },
  "Kashmiri Chilly (Eastern)": { type: "PACKED", sheet: "FRESHITEM" },
  "Garam Masala (Eastern)": { type: "PACKED", sheet: "FRESHITEM" },
  "Coriander Powder (Eastern)": { type: "PACKED", sheet: "FRESHITEM" },
  "Chilly Powder (Eastern)": { type: "PACKED", sheet: "FRESHITEM" },
  "Fish Masala (Eastern)": { type: "PACKED", sheet: "FRESHITEM" },
  "Meat Masala (Eastern)": { type: "PACKED", sheet: "FRESHITEM" },
  "Chicken Masala (Eastern)": { type: "PACKED", sheet: "FRESHITEM" },
  "Adimali Coffee (Eastern)": { type: "PACKED", sheet: "FRESHITEM" },
  "Crushed Chilly": { type: "PACKED", sheet: "FRESHITEM" },
  "Perumjeerakam / Fennel Seeds / Saunf (Quality Brand)": { type: "PACKED", sheet: "FRESHITEM" },
  "Jeerakam Seeds / Cumin Seeds (Quality Brand)": { type: "PACKED", sheet: "FRESHITEM" },
  "Uluva Seeds / Fenugreek Seeds (Quality Brand)": { type: "PACKED", sheet: "FRESHITEM" },
  "Mustard Seeds (Pepko Brand)": { type: "PACKED", sheet: "FRESHITEM" },
  "White Peas / Vella Pattani": { type: "PACKED", sheet: "FRESHITEM" },
  "Pottu Kadala / Chutney Dal": { type: "PACKED", sheet: "FRESHITEM" },
  "Kadala Paripu / Chana Dal": { type: "PACKED", sheet: "FRESHITEM" },
  "Payasam Paripu / Moong Duli": { type: "PACKED", sheet: "FRESHITEM" },
  "Cherupayar / Moong Dal /Green Sabooth": { type: "PACKED", sheet: "FRESHITEM" },
  "Kadala / Kala Chana": { type: "PACKED", sheet: "FRESHITEM" },
  "Sambar Parippu/ Dal Big Unpolished": { type: "PACKED", sheet: "FRESHITEM" },
  "Van Payar/ Kerala Lobia": { type: "PACKED", sheet: "FRESHITEM" },
  "Ragi Powder (Baby Vita)": { type: "PACKED", sheet: "FRESHITEM" },
  "Rice Banana Powder (Baby Vita)": { type: "PACKED", sheet: "FRESHITEM" },
  "Banana Powder (Baby Vita)": { type: "PACKED", sheet: "FRESHITEM" },
  "NS Rice Ada": { type: "PACKED", sheet: "FRESHITEM" },
  "LG Kayam Powder/ Asafoetida Powder": { type: "PACKED", sheet: "FRESHITEM" },
  "LG Kayam Katta/ Asafoetida Slab": { type: "PACKED", sheet: "FRESHITEM" },
  "NS Kayam Powder/ Asafoetida Powder": { type: "PACKED", sheet: "FRESHITEM" },
  "NS Kayam Katta/ Asafoetida Slab": { type: "PACKED", sheet: "FRESHITEM" },
  "Dheedhi Shampoo": { type: "PACKED", sheet: "FRESHITEM" },
  "Dhathri Hair Care Oil (White)": { type: "PACKED", sheet: "FRESHITEM" },
  "Eladi Chewable Tablet": { type: "PACKED", sheet: "FRESHITEM" },
  "Gingelly/Sesame Oil (Idhayam Brand)": { type: "PACKED", sheet: "FRESHITEM" },
  "Gingelly Oil (R G Brand)": { type: "PACKED", sheet: "FRESHITEM" },
  "Gundur Round Dry Chilly": { type: "PACKED", sheet: "FRESHITEM" },
  "Red Chilly": { type: "PACKED", sheet: "FRESHITEM" },
  "Kondattam Curd Chilly": { type: "PACKED", sheet: "FRESHITEM" },
  "Panakalkandam": { type: "PACKED", sheet: "FRESHITEM" },
  "Jaggery Unda": { type: "PACKED", sheet: "FRESHITEM" },
  "Karupatti / Palm Jaggery": { type: "PACKED", sheet: "FRESHITEM" },
  "Jaggery Powder": { type: "PACKED", sheet: "FRESHITEM" },
  "Chukku Kappi - 1 Cube One Cup": { type: "PACKED", sheet: "FRESHITEM" },
  "Manthi Arabian Kit (Shappad)": { type: "PACKED", sheet: "FRESHITEM" },
  "Pathimugam (Shappad)": { type: "PACKED", sheet: "FRESHITEM" },
  "Dahashamini (Shappad)": { type: "PACKED", sheet: "FRESHITEM" },
  "Rasakootu (Shappad)": { type: "PACKED", sheet: "FRESHITEM" },
  "Kissmiss (Shappad)": { type: "PACKED", sheet: "FRESHITEM" },
  "Cashew Nut (Shappad)": { type: "PACKED", sheet: "FRESHITEM" },
  "Yeast (Shappad)": { type: "PACKED", sheet: "FRESHITEM" },
  "Tuna Flakes In Water (Tasty Nibbles RTE)": { type: "PACKED", sheet: "FRESHITEM" },
  "Sardine In Sunflower Oil (Tasty Nibbles RTE)": { type: "PACKED", sheet: "FRESHITEM" },
  "Tuna Chunks In Sunflower Oil (Tasty Nibbles RTE)": { type: "PACKED", sheet: "FRESHITEM" },
  "Avial Curry (Tasty Nibbles RTE)": { type: "PACKED", sheet: "FRESHITEM" },
  "Sambar Curry (Tasty Nibbles RTE)": { type: "PACKED", sheet: "FRESHITEM" },
  "Kappa Puzhukku (Tasty Nibbles RTE)": { type: "PACKED", sheet: "FRESHITEM" },
  "Fish Peera (Tasty Nibbles RTE)": { type: "PACKED", sheet: "FRESHITEM" },
  "Chettinad Pepper Chicken (Tasty Nibbles RTE)": { type: "PACKED", sheet: "FRESHITEM" },
  "Kuttanadan Duck Roast (Tasty Nibbles RTE)": { type: "PACKED", sheet: "FRESHITEM" },
  "Erachi Meat Roast (Tasty Nibbles RTE)": { type: "PACKED", sheet: "FRESHITEM" },
  "Roasted Coconut Paste (Tasty Nibbles RTE)": { type: "PACKED", sheet: "FRESHITEM" },
  "Kerala Fish Curry in Coconut Oil (Tasty Nibbles RTE)": { type: "PACKED", sheet: "FRESHITEM" },
  "Synthetic Vinegar (Tasty Nibbles)": { type: "PACKED", sheet: "FRESHITEM" },
  "Instant Vermicelli Payasam Mix (Tasty Nibbles)": { type: "PACKED", sheet: "FRESHITEM" },
  "Kerala Instant Palada Payasam Mix (Tasty Nibbles)": { type: "PACKED", sheet: "FRESHITEM" },
  "Instant Idiyappam Pouch (Tasty Nibbles)": { type: "PACKED", sheet: "FRESHITEM" },
  "Milma Ghee": { type: "PACKED", sheet: "FRESHITEM" },
  "Ponni Rice (SS Rajbhogam Premium Repacked)": { type: "PACKED", sheet: "FRESHITEM" },
  "Idli Rice (TG Brand, Repacked)": { type: "PACKED", sheet: "FRESHITEM" },
  "Vattayappam Podi (Ponkathir)": { type: "PACKED", sheet: "FRESHITEM" },
  "Chemba Puttu Podi (Ponkathir)": { type: "PACKED", sheet: "FRESHITEM" },
  "Appam Podi (Ponkathir)": { type: "PACKED", sheet: "FRESHITEM" },
  "Roasted Rava (Ponkathir)": { type: "PACKED", sheet: "FRESHITEM" },
  "Puttu Podi (Ponkathir)": { type: "PACKED", sheet: "FRESHITEM" },
  "Red Bran Rice Unpolished (Robinfood Brand Repacked)": { type: "PACKED", sheet: "FRESHITEM" },
  "Aval Thin Beaten (Pavizham) Matta Rice Nylon": { type: "PACKED", sheet: "FRESHITEM" },
  "Aval Roasted (Pavizham) Matta Rice Flakes": { type: "PACKED", sheet: "FRESHITEM" },
  "Jaya Rice (Pavizham Repacked)": { type: "PACKED", sheet: "FRESHITEM" },
  "Vadi Rice (Pavizham Repacked) / Long Grain": { type: "PACKED", sheet: "FRESHITEM" },
  "Unda Rice (Pavizham Repacked)/ Short Grain": { type: "PACKED", sheet: "FRESHITEM" },
  "Masala Peanut": { type: "SNACK", sheet: "PACKED" },
  "Kerala Pappadam": { type: "SNACK", sheet: "PACKED" },
  "Cleaned Nadan Cheriya Ulli (300g) & Grated Kerala Coconut (200g)": { type: "EXTRA", sheet: "PROD" },

  // MISC Items
  "Paper Plate": { type: null, sheet: "MISC" },
  "Snack Box Packing Charges": { type: null, sheet: "MISC" },
  "Brown Paper Carry Bag": { type: null, sheet: "MISC" },
  "Delivery Charge": { type: null, sheet: "MISC" },

  // FRESHITEM Items
  "Chakkakuru (Jackfruit Seed)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Kada Chakka Raw (Butter Fruit)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Cleaned Thenvarikka Chakka Pazham (Jackfruit) 400gm": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Pacha Chakka Cleaned (Raw Jackfruit)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Cleaned Thenvarikka Chakka Pazham (Jackfruit)": { 
    type: "VEG FRUIT", 
    sheet: "FRESHITEM",
    originalName: "Cleaned Thenvarikka Chakka Pazham (Jackfruit) 400gm"
  },
  "Moovandan Manga Pazham (Ripe Kerala Mango)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Padavalanga (Snake Gourd)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Mathanga (Yellow Pumpkin)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Cherakka (Snake Gourd)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Kachil": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Muvandan Manga Pacha (Raw Kerala Mango)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Palayamkodan Pazham (Cheru Pazham Semi Ripened/ Fully Ripened)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Coconut Big (Whole)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Cheru Ulli (Shallots / Small Onions)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Coconut Big Opened (തേങ്ങ പൊട്ടിച്ചത്)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Jyali Poovan (Cheru Pazham Semi Ripened/ Fully Ripened))": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Ethakka / Nendran Nadan Kerala (Ripe)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Kappa Nadan Kerala (കപ്പ / Tapioca / Cassava)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Muringa Kol Nadan (മുരിങ്ങക്കോൽ / Drumstick)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Kumbalanga (Ash Gourd)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Chena (ചേന / Elephant Foot Yam)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Koorka (കൂർക്ക)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Chembu": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Vellarikka / Vellari Nadan (വെള്ളരിക്ക)": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Pacha Kaya / Raw Nendran Banana": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Homemade Wine": { type: "PACKED", sheet: "FRESHITEM" },
  "Juice": { type: "PACKED", sheet: "FRESHITEM" },
  "Vegetables Kit Vishu Sadhya (Family Pack)": { type: "PACKED", sheet: "FRESHITEM" },
  "Nambeesan Ghee": { type: "PACKED", sheet: "FRESHITEM" },
  "Sambar Powder (Brahmins)": { type: "PACKED", sheet: "FRESHITEM" },
  "Instant Palada Payasam Mix (Brahmins)": { type: "PACKED", sheet: "FRESHITEM" },
  "Instant Semiya Payasam Mix (Brahmins)": { type: "PACKED", sheet: "FRESHITEM" },
  "Hot and Sweet Pickle (Brahmins)": { type: "PACKED", sheet: "FRESHITEM" },
  "Ginger Pickle (Brahmins)": { type: "PACKED", sheet: "FRESHITEM" },
  "Garlic Pickle (Brahmins)": { type: "PACKED", sheet: "FRESHITEM" },
  "Lime Pickle (Brahmins)": { type: "PACKED", sheet: "FRESHITEM" },
  "Sliced Mango Pickle (Brahmins)": { type: "PACKED", sheet: "FRESHITEM" },
  "Easy Palappam Mix (Brahmins)": { type: "PACKED", sheet: "FRESHITEM" },
  "Appam Idiyappam Powder (Brahmins)": { type: "PACKED", sheet: "FRESHITEM" },
  "Nurungu Ari Broken Rice (Brahmins)": { type: "PACKED", sheet: "FRESHITEM" },
  "Aval Red Rice Flakes (Brahmins)": { type: "PACKED", sheet: "FRESHITEM" },
  "Puttu Podi Chemba Red (Brahmins)": { type: "PACKED", sheet: "FRESHITEM" },
  "Puttu Podi White (Brahmins)": { type: "PACKED", sheet: "FRESHITEM" },

  // MAHABELLY Items
  "Chakka Chicken Curry Festival Box (Family Pack)": { type: null, sheet: "MAHABELLY" },
  "Chakka Erachi Curry Festival Box (Family Pack)": { type: null, sheet: "MAHABELLY" },
  "Mutton Curry (Kerala Style)": { type: null, sheet: "MAHABELLY" },
  "Kerala Chicken Fry": { type: null, sheet: "MAHABELLY" },
  "Beans Thoran": { type: null, sheet: "MAHABELLY" },
  "Avial (Kerala Special)": { type: null, sheet: "MAHABELLY" },
  "Kalan/Moru Curry (Kerala Style)": { type: null, sheet: "MAHABELLY" },
  "Sambar (Kerala Style)": { type: null, sheet: "MAHABELLY" },
  "Kerala Rice Boiled (Matta Rice)": { type: null, sheet: "MAHABELLY" },
  "Nadan Chicken Curry (Kerala Special)": { type: null, sheet: "MAHABELLY" },
  "Kerala Appam (Fresh)": { type: null, sheet: "MAHABELLY" },
  "Malabar Porotta (Fresh)": { type: null, sheet: "MAHABELLY" },
  "Alfaham Kerala Style with Nadan Kuboos": { type: null, sheet: "MAHABELLY" },
  "Kerala Shawarma in Nadan Kuboos": { type: null, sheet: "MAHABELLY" },
  "Nadan Shawarma Grape Juice Combo Box": { type: null, sheet: "MAHABELLY" },
  "Alfaham Grape Juice Combo Box": { type: null, sheet: "MAHABELLY" },
  "Shawaya Arabic Salkaram Box": { type: null, sheet: "MAHABELLY" },
  "Pal Payasam": { type: null, sheet: "MAHABELLY" },
  "Full Vishu Sadhya Kit (Family Pack)": { type: null, sheet: "MAHABELLY" },

  // PACKED Items
  "Jackfruit Halwa (Nadan Style)": { type: "HALWA", sheet: "PACKED" },
  "Kozikoden Red Halwa (Made in Coconut Oil)": { type: "HALWA", sheet: "PACKED" },
  "Kozikoden Black Halwa (Made in Coconut Oil)": { type: "HALWA", sheet: "PACKED" },
  "Vettu Cake": { type: "SNACK", sheet: "PACKED" },
  "Vettu Cake (1 Pc)": { type: "BAKERY", sheet: "PACKED" },
  "Kerala Laddu": { type: "BAKERY", sheet: "PACKED" },
  "Dilkush / Coconut Bun": { type: "BAKERY", sheet: "PACKED" },
  "Sweet Porotta": { type: "BAKERY", sheet: "PACKED" },
  "Sweet Bun / Soft": { type: "BAKERY", sheet: "PACKED" },
  "Cream Bun": { type: "BAKERY", sheet: "PACKED" },
  "Kerala Bakery Soft Bread (Pacha Rotti)": { type: "BAKERY", sheet: "PACKED" },
  "Exotic Rum Plum Cake": { type: "CAKE", sheet: "PACKED" },
  "JD Plum Cake": { type: "CAKE", sheet: "PACKED" },
  "Exotic Eggless Plum Cake": { type: "CAKE", sheet: "PACKED" },
  "Classic Plum Cake": { type: "CAKE", sheet: "PACKED" },
  "Eggless Plum Cake": { type: "CAKE", sheet: "PACKED" },
  "Rich Plum Cake": { type: "CAKE", sheet: "PACKED" },
  "Sugar Free Stevia Plum Cake": { type: "CAKE", sheet: "PACKED" },
  "Eggless X'mas Cake Tasting Sample Box": { type: "CAKE", sheet: "PACKED" },
  "X'mas Cakes Tasting Sample Box": { type: "CAKE", sheet: "PACKED" },
  "Eggless Spice Cake": { type: "CAKE", sheet: "PACKED" },
  "Chicken Pickle (Less Salty Kerala Home-made)": { type: "PICKLE", sheet: "PACKED" },
  "Vadukapuli Lime Hot & Sweet Pickle (Less Salty Kerala Home-made)": { type: "PICKLE", sheet: "PACKED" },
  "Lime Pickle (Less Salty Kerala Home-made)": { type: "PICKLE", sheet: "PACKED" },
  "Tender Mango / Kanni Manga Pickle (Less Salty Kerala Home-made)": { type: "PICKLE", sheet: "PACKED" },
  "White Lime Pickle (Less Salty Kerala Home-made)": { type: "PICKLE", sheet: "PACKED" },
  "Prawns Pickle (Less Salty Kerala Home-made)": { type: "PICKLE", sheet: "PACKED" },
  "Hot & Sweet Lime Pickle (Less Salty Kerala Home-made)": { type: "PICKLE", sheet: "PACKED" },
  "Garlic Pickle (Less Salty Kerala Home-made)": { type: "PICKLE", sheet: "PACKED" },
  "Fish Pickle (Less Salty Kerala Home-made)": { type: "PICKLE", sheet: "PACKED" },
  "Erachi Pickle (Less Salty Kerala Home-made)": { type: "PICKLE", sheet: "PACKED" },
  "Cut Mango Pickle (Less Salty Kerala Home-made)": { type: "PICKLE", sheet: "PACKED" },
  "Dry Prawns Roast (Chemmeen Roast)": { type: "CHUTNEY", sheet: "PACKED" },
  "Gun Powder Chutney (Idli/Dosa Molag Powder)": { type: "CHUTNEY", sheet: "PACKED" },
  "Coconut Chutney Powder (Thenga Chamanthi Podi)": { type: "CHUTNEY", sheet: "PACKED" },
  "Blackened Gooseberry Pickle (Kari Nellika)": { type: "CHUTNEY", sheet: "PACKED" },
  "Prawns Chutney Powder (Chemmeen Chammanthi Podi)": { type: "CHUTNEY", sheet: "PACKED" },
  "Dry Chilli Chutney (Chuttu Aracha Mulaku Chammanthi)": { type: "CHUTNEY", sheet: "PACKED" },
  "Idi Erachi (Pounded Meat)": { type: "CHUTNEY", sheet: "PACKED" },

  // PROD Items
  "Jackfruit Cake": { type: "CAKE", sheet: "PROD" },
  "Choco Mud Cake (Eggless, 24 Slices/Kg)": { type: "CAKE", sheet: "PROD" },
  "Carrot and Dates Cake (Eggless, 24 Slices/Kg)": { type: "CAKE", sheet: "PROD" },
  "Chocolate Mud Cake": { type: "CAKE", sheet: "PROD" },
  "Marble Cake": { type: "CAKE", sheet: "PROD" },
  "Ghee Cake": { type: "CAKE", sheet: "PROD" },
  "Banana and Walnut Cake": { type: "CAKE", sheet: "PROD" },
  "Carrot and Dates Cake": { type: "CAKE", sheet: "PROD" },
  "Kuboos Big (Kerala Nadan Style)": { type: "SNACK", sheet: "PROD" },
  "Paneer Roll": { type: "SNACK", sheet: "PROD" },
  "Boli (Nadan Kerala Famous)": { type: "SNACK", sheet: "PROD" },
  "Kozhikotta": { type: "SNACK", sheet: "PROD" },
  "Unnakaya": { type: "SNACK", sheet: "PROD" },
  "Kerala Chicken Samosa": { type: "SNACK", sheet: "PROD" },
  "Kerala Veg Samosa": { type: "SNACK", sheet: "PROD" },
  "Sugiyan": { type: "SNACK", sheet: "PROD" },
  "Uzhunnu Vada": { type: "SNACK", sheet: "PROD" },
  "Chicken Roll": { type: "SNACK", sheet: "PROD" },
  "Chicken Cutlet": { type: "SNACK", sheet: "PROD" },
  "Parippu Vada": { type: "SNACK", sheet: "PROD" },
  "Pazham Pori": { type: "SNACK", sheet: "PROD" },
  "Paneer Puffs": { type: "PUFFS", sheet: "PROD" },
  "Mix Veg Puffs": { type: "PUFFS", sheet: "PROD" },
  "Chicken Puffs": { type: "PUFFS", sheet: "PROD" },
  "Egg Puffs": { type: "PUFFS", sheet: "PROD" },
  "Blueberry Muffin": { type: "MUFFIN", sheet: "PROD" },
  "Chocolate Muffin": { type: "MUFFIN", sheet: "PROD" },
  "Pineapple Muffin": { type: "MUFFIN", sheet: "PROD" },
  "Chocolate Brownie": { type: "MUFFIN", sheet: "PROD" },
  "Oats & Raisins Cookie": { type: "COOKIE", sheet: "PROD" },
  "Grated Kerala Coconut": { type: "EXTRA", sheet: "PROD" },
  "Cleaned Nadan Cheriya Ulli (Small Onion)": { type: "EXTRA", sheet: "PROD" },
  "Cleaned Nadan Cheriya Ulli & Grated Kerala Coconut": {
    type: "EXTRA",
    sheet: "PROD",
    originalName: "Cleaned Nadan Cheriya Ulli (300g) & Grated Kerala Coconut (200g)"
  },
  "Arabian Pulpy Grape Juice": { type: "EXTRA", sheet: "PROD" },

  // PACKED Items continued
  "Sharkara Varatti": { type: "SNACK", sheet: "PACKED" },
  "Madhura Seva": { type: "SNACK", sheet: "PACKED" },
  "Kuzhalappam Sweet": { type: "SNACK", sheet: "PACKED" },
  "Roasted Peanut": { type: "SNACK", sheet: "PACKED" },
  "Avalose Unda": { type: "SNACK", sheet: "PACKED" },
  "Ribbon Pakkavada": { type: "SNACK", sheet: "PACKED" },
  "Kara Seva": { type: "SNACK", sheet: "PACKED" },
  "Jackfruit / Chakka Chips (Made in Coconut Oil)": { type: "SNACK", sheet: "PACKED" },
  "Jackfruit Chips (Chakka Chips)": { type: "SNACK", sheet: "PACKED" },
  "Sweet Rice Tubes (Sweet Kuzhalappam)": { type: "SNACK", sheet: "PACKED" },
  "Rose Cookies (Achappam / Achu Murukku)": { type: "SNACK", sheet: "PACKED" },
  "Kerala Pappadam (Papad)": { type: "SNACK", sheet: "PACKED" },
  "Inji Mittai Bottle Small (Petti Kada Mittai)": { type: "CANDY", sheet: "PACKED" },
  "Puli Sip Up Bottle Small (Petti Kada Mittai)": { type: "CANDY", sheet: "PACKED" },
  "Jeerka Mittai Bottle Small ( Petti Kada Mittai)": { type: "CANDY", sheet: "PACKED" },
  "Thaen Mittai (Petti Kada Mittai)": { type: "CANDY", sheet: "PACKED" },
  "Puli Shot Bottle Small (Petti Kada Mittai)": { type: "CANDY", sheet: "PACKED" },
  "Chow Mittai Bottle Small (Petti Kada Mittai)": { type: "CANDY", sheet: "PACKED" },
  "Gas Mittai Bottle Small (Petti Kada Mittai)": { type: "CANDY", sheet: "PACKED" },
  "Naranga Mttai Bottle Small (Petti Kada Mittai)": { type: "CANDY", sheet: "PACKED" },
  "Petti Kada Nostalgic Candies Combo (7 Varieties)": { type: "CANDY", sheet: "PACKED" },
  "Tapioca Chips Round Spicy": { type: "CHIPS", sheet: "PACKED" },
  "Tapioca Chips Round Salted": { type: "CHIPS", sheet: "PACKED" },
  "Tapioca Chips Stick Spicy": { type: "CHIPS", sheet: "PACKED" },
  "Ripened Banana / Pazham Chips": { type: "CHIPS", sheet: "PACKED" },
  "Tapioca Chips Stick Salted": { type: "CHIPS", sheet: "PACKED" },
  "Tapioca Chips, Banana Chips & Murukku Combo (3 Varieties)": { type: "CHIPS", sheet: "PACKED" },
  "Chilli Onion Murukku": { type: "MURUKKU", sheet: "PACKED" },
  "Chilli Garlic Murukku": { type: "MURUKKU", sheet: "PACKED" },
  "Stick Murukku Salted": { type: "MURUKKU", sheet: "PACKED" },
  "Round Murukku Salted": { type: "MURUKKU", sheet: "PACKED" },
  "Stick Murukku Masala": { type: "MURUKKU", sheet: "PACKED" },
  "Round Murukku Masala": { type: "MURUKKU", sheet: "PACKED" },
  "Murukku Combo (3 Varieties)": { type: "MURUKKU", sheet: "PACKED" },
  "Payyoli Mixture": { type: "MIXTURE", sheet: "PACKED" },
  "Bombay Mixture": { type: "MIXTURE", sheet: "PACKED" },
  "Kerala Spicy Mixture": { type: "MIXTURE", sheet: "PACKED" },
  "Kerala White Mixture": { type: "MIXTURE", sheet: "PACKED" },
  "Super Thin Banana Chips Coconut Oil (Pudina)": { type: "BANANA", sheet: "PACKED" },
  "Super Thin Banana Chips Coconut Oil (Indian Spicy Masala)": { type: "BANANA", sheet: "PACKED" },
  "Super Thin Banana Chips Coconut Oil (Pepper & Salt)": { type: "BANANA", sheet: "PACKED" },
  "Super Thin Banana Chips Coconut Oil (Classic Salted)": { type: "BANANA", sheet: "PACKED" },
  "Super Thin Kerala Banana Chips Combo (3 Varieties)": { type: "BANANA", sheet: "PACKED" },
  "Super Thin Vacuum Fried Banana Chips": { type: "BANANA", sheet: "PACKED" },
  "Oats & Jaggery Cookies": { type: "COOKIE", sheet: "PACKED" },
  "Spicy Masala Cookies": { type: "COOKIE", sheet: "PACKED" },
  "Coconut Biscuits": { type: "COOKIE", sheet: "PACKED" },
  "Peanut Chikki Combo (2 Varieties)": { type: "CHIKKI", sheet: "PACKED" },
  "Crushed Coconut Peanut Chikki Jar": { type: "CHIKKI", sheet: "PACKED" },
  "Omega Peanut Chikki Jar": { type: "CHIKKI", sheet: "PACKED" },
  "Flaxseed Peanut Chikki Jar": { type: "CHIKKI", sheet: "PACKED" },
  "Pumpkin Seed Peanut Chikki Jar": { type: "CHIKKI", sheet: "PACKED" },
  "Multigrain Peanut Chikki Jar": { type: "CHIKKI", sheet: "PACKED" },
  "Coconut Jaggery Peanut Chikki Jar": { type: "CHIKKI", sheet: "PACKED" },
  "Chia Seed Peanut Chikki Jar": { type: "CHIKKI", sheet: "PACKED" },
  "Brahmi Peanut Chikki Jar": { type: "CHIKKI", sheet: "PACKED" },
  "Ashwagandha Peanut Chikki Jar": { type: "CHIKKI", sheet: "PACKED" },
  "Moringa Peanut Chikki Jar": { type: "CHIKKI", sheet: "PACKED" },
  "Prawns Roast & Prawns Chutney Powder Combo (2 Varieties)": { type: "CHUTNEY", sheet: "PACKED" },
  "Chutney Powders Combo (3 Varieties)": { type: "CHUTNEY", sheet: "PACKED" },

  // FRESHITEM PACKED Items
  "Cuticura Talc Original Bloom": { type: "PACKED", sheet: "FRESHITEM" },
  "Cuticura Soap Original Bloom": { type: "PACKED", sheet: "FRESHITEM" },
  "Cutee White Zaffron Soap": { type: "PACKED", sheet: "FRESHITEM" },
  "Cutee Silky Skin Soap": { type: "PACKED", sheet: "FRESHITEM" },
  "Cutee Sandal Soap": { type: "PACKED", sheet: "FRESHITEM" },
  "Cutee Papaya Fruit Mix Soap": { type: "PACKED", sheet: "FRESHITEM" },
  "Cutee Olive Sona Soap": { type: "PACKED", sheet: "FRESHITEM" },
  "Cutee Milky Almond Soap": { type: "PACKED", sheet: "FRESHITEM" },
  "Cutee Lavender Bloom Soap": { type: "PACKED", sheet: "FRESHITEM" },
  "Cutee Herbow Soap": { type: "PACKED", sheet: "FRESHITEM" },
  "Cutee Haldi Manjal Soap": { type: "PACKED", sheet: "FRESHITEM" },
  "Coconut Oil (Pavizham)": { type: "PACKED", sheet: "FRESHITEM" },
  "Pure Coconut Oil Premium (Pavizham)": { type: "PACKED", sheet: "FRESHITEM" },
  "Milk Powder (KFL)": { type: "PACKED", sheet: "FRESHITEM" },
  "Coconut Oil (KLF)": { type: "PACKED", sheet: "FRESHITEM" },

  // Recently identified products that need to be added
  "Vazha Koombu Nadan Cleaned & Sliced (Banana Flower) - For 4 - 5 People": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Chembu Nadan Curry Cut & Cleaned / Taro Root - For 3 to 4 people": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Raw Mango Cleaned Sliced (Pachai Maangai) - For 5 to 6 people": { type: "VEG FRUIT", sheet: "FRESHITEM" },
  "Elephant Foot Yam Curry Cut (Chena/Suran) - For 4 to 5 people": { type: "VEG FRUIT", sheet: "FRESHITEM" }
}; 