/**
 * Static lookup object for product categories derived from Look up list.csv
 * This object maps product names to their sheet and type information
 */

export interface ProductInfo {
  sheet: string;
  type: string | null;
  originalName?: string; // Original product name before normalization
}

// Google Sheets CSV URL for the lookup table
const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/1WpQGDlmLcBbfIsk9Yehwr2snozVll1swa22eOBiMhnM/export?format=csv&gid=0';

// Dynamic category lookup - will be populated from Google Sheets
let DYNAMIC_CATEGORY_LOOKUP: Record<string, ProductInfo> = {};

/**
 * Fetches and parses CSV data from Google Sheets
 * @returns Promise<Record<string, ProductInfo>> Parsed lookup object
 */
async function fetchGoogleSheetsLookup(): Promise<Record<string, ProductInfo>> {
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
 * @param csvText Raw CSV data
 * @returns Parsed lookup object
 */
function parseCSVToLookup(csvText: string): Record<string, ProductInfo> {
  const lookup: Record<string, ProductInfo> = {};
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
 * @param line CSV line
 * @returns Parsed columns
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
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
 * @returns Promise<void>
 */
export async function initializeLookup(): Promise<void> {
  DYNAMIC_CATEGORY_LOOKUP = await fetchGoogleSheetsLookup();
}

/**
 * Gets category info for a product, checking Google Sheets first, then fallback
 * @param productName Product name to lookup
 * @returns Category info or null if not found
 */
export function getCategoryInfo(productName: string): ProductInfo | null {
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
 * Normalizes a product name by standardizing portion sizes and removing variations
 * @param name Product name to normalize
 * @returns Normalized product name
 */
export function normalizeProductName(name: string): string {
  // Remove/standardize portion sizes (ml, ML, Lt, LT, g, gm, GM, kg, KG, Kg)
  return name.replace(/\s*\d+\s*(ml|ML|Lt|LT|g|gm|GM|kg|KG|Kg)\b/g, '')
            .replace(/\(\s*\)/g, '') // Remove empty parentheses
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
}

export const CATEGORY_LOOKUP: Record<string, ProductInfo> = {
  "Paper Plate": { sheet: "MISC", type: null },
  "Chakkakuru (Jackfruit Seed)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Kada Chakka Raw (Butter Fruit)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Cleaned Thenvarikka Chakka Pazham (Jackfruit)": { 
    sheet: "FRESHITEM", 
    type: "VEG FRUIT",
    originalName: "Cleaned Thenvarikka Chakka Pazham (Jackfruit) 400gm"
  },
  "Pacha Chakka Cleaned (Raw Jackfruit)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Chakka Chicken Curry Festival Box (Family Pack)": { sheet: "MAHABELLY", type: null },
  "Chakka Erachi Curry Festival Box (Family Pack)": { sheet: "MAHABELLY", type: null },
  "Jackfruit Halwa (Nadan Style)": { sheet: "PACKED", type: "HALWA" },
  "Jackfruit Cake": { sheet: "PROD", type: "CAKE" },
  "Moovandan Manga Pazham (Ripe Kerala Mango)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Mutton Curry (Kerala Style)": { sheet: "MAHABELLY", type: null },
  "Kerala Chicken Fry": { sheet: "MAHABELLY", type: null },
  "Beans Thoran": { sheet: "MAHABELLY", type: null },
  "Avial (Kerala Special)": { sheet: "MAHABELLY", type: null },
  "Kalan/Moru Curry (Kerala Style)": { sheet: "MAHABELLY", type: null },
  "Sambar (Kerala Style)": { sheet: "MAHABELLY", type: null },
  "Kerala Rice Boiled (Matta Rice)": { sheet: "MAHABELLY", type: null },
  "Nadan Chicken Curry (Kerala Special)": { sheet: "MAHABELLY", type: null },
  "Kerala Appam (Fresh)": { sheet: "MAHABELLY", type: null },
  "Malabar Porotta (Fresh)": { sheet: "MAHABELLY", type: null },
  "Padavalanga (Snake Gourd)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Mathanga (Yellow Pumpkin)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Cherakka (Snake Gourd)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Kachil": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Muvandan Manga Pacha (Raw Kerala Mango)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Palayamkodan Pazham (Cheru Pazham Semi Ripened/ Fully Ripened)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Choco Mud Cake (Eggless, 24 Slices/Kg)": { sheet: "PROD", type: "CAKE" },
  "Kuboos Big (Kerala Nadan Style)": { sheet: "PROD", type: "SNACK" },
  "Paneer Roll": { sheet: "PROD", type: "SNACK" },
  "Alfaham Kerala Style with Nadan Kuboos": { sheet: "MAHABELLY", type: null },
  "Kerala Shawarma in Nadan Kuboos": { sheet: "MAHABELLY", type: null },
  "Carrot and Dates Cake (Eggless, 24 Slices/Kg)": { sheet: "PROD", type: "CAKE" },
  "Nadan Shawarma Grape Juice Combo Box": { sheet: "MAHABELLY", type: null },
  "Alfaham Grape Juice Combo Box": { sheet: "MAHABELLY", type: null },
  "Homemade Wine": { sheet: "FRESHITEM", type: "PACKED" },
  "Shawaya Arabic Salkaram Box": { sheet: "MAHABELLY", type: null },
  "Pal Payasam": { sheet: "MAHABELLY", type: null },
  "Boli (Nadan Kerala Famous)": { sheet: "PROD", type: "SNACK" },
  "Kozhikotta": { sheet: "PROD", type: "SNACK" },
  "Coconut Big (Whole)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Full Vishu Sadhya Kit (Family Pack)": { sheet: "MAHABELLY", type: null },
  "Vegetables Kit Vishu Sadhya (Family Pack)": { sheet: "FRESHITEM", type: "PACKED" },
  "Paneer Puffs": { sheet: "PROD", type: "PUFFS" },
  "Arabian Pulpy Grape Juice": { sheet: "PROD", type: "EXTRA" },
  "Cuticura Talc Original Bloom": { sheet: "FRESHITEM", type: "PACKED" },
  "Cuticura Soap Original Bloom": { sheet: "FRESHITEM", type: "PACKED" },
  "Cutee White Zaffron Soap": { sheet: "FRESHITEM", type: "PACKED" },
  "Cutee Silky Skin Soap": { sheet: "FRESHITEM", type: "PACKED" },
  "Cutee Sandal Soap": { sheet: "FRESHITEM", type: "PACKED" },
  "Cutee Papaya Fruit Mix Soap": { sheet: "FRESHITEM", type: "PACKED" },
  "Cutee Olive Sona Soap": { sheet: "FRESHITEM", type: "PACKED" },
  "Cutee Milky Almond Soap": { sheet: "FRESHITEM", type: "PACKED" },
  "Cutee Lavender Bloom Soap": { sheet: "FRESHITEM", type: "PACKED" },
  "Cutee Herbow Soap": { sheet: "FRESHITEM", type: "PACKED" },
  "Cutee Haldi Manjal Soap": { sheet: "FRESHITEM", type: "PACKED" },
  "Coconut Oil (Pavizham)": { sheet: "FRESHITEM", type: "PACKED" },
  "Vettu Cake (1 Pc)": { sheet: "PACKED", type: "BAKERY" },
  "Snack Box Packing Charges": { sheet: "MISC", type: null },
  "Cheru Ulli (Shallots / Small Onions)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Coconut Big Opened (തേങ്ങ പൊട്ടിച്ചത്)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Jyali Poovan (Cheru Pazham Semi Ripened/ Fully Ripened))": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Ethakka / Nendran Nadan Kerala (Ripe)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Kappa Nadan Kerala (കപ്പ / Tapioca / Cassava)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Muringa Kol Nadan (മുരിങ്ങക്കോൽ / Drumstick)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Kumbalanga (Ash Gourd)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Chena (ചേന / Elephant Foot Yam)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Koorka (കൂർക്ക)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Chembu": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Vellarikka / Vellari Nadan (വെള്ളരിക്ക)": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Pacha Kaya / Raw Nendran Banana": { sheet: "FRESHITEM", type: "VEG FRUIT" },
  "Nambeesan Ghee": { sheet: "FRESHITEM", type: "PACKED" },
  "Sambar Powder (Brahmins)": { sheet: "FRESHITEM", type: "PACKED" },
  "Instant Palada Payasam Mix (Brahmins)": { sheet: "FRESHITEM", type: "PACKED" },
  "Instant Semiya Payasam Mix (Brahmins)": { sheet: "FRESHITEM", type: "PACKED" },
  "Hot and Sweet Pickle (Brahmins)": { sheet: "FRESHITEM", type: "PACKED" },
  "Ginger Pickle (Brahmins)": { sheet: "FRESHITEM", type: "PACKED" },
  "Garlic Pickle (Brahmins)": { sheet: "FRESHITEM", type: "PACKED" },
  "Lime Pickle (Brahmins)": { sheet: "FRESHITEM", type: "PACKED" },
  "Sliced Mango Pickle (Brahmins)": { sheet: "FRESHITEM", type: "PACKED" },
  "Easy Palappam Mix (Brahmins)": { sheet: "FRESHITEM", type: "PACKED" },
  "Appam Idiyappam Powder (Brahmins)": { sheet: "FRESHITEM", type: "PACKED" },
  "Nurungu Ari Broken Rice (Brahmins)": { sheet: "FRESHITEM", type: "PACKED" },
  "Aval Red Rice Flakes (Brahmins)": { sheet: "FRESHITEM", type: "PACKED" },
  "Puttu Podi Chemba Red (Brahmins)": { sheet: "FRESHITEM", type: "PACKED" },
  "Puttu Podi White (Brahmins)": { sheet: "FRESHITEM", type: "PACKED" },
  "Pure Coconut Oil Premium (Pavizham)": { sheet: "FRESHITEM", type: "PACKED" },
  "Milk Powder (KFL)": { sheet: "FRESHITEM", type: "PACKED" },
  "Coconut Oil (KLF)": { sheet: "FRESHITEM", type: "PACKED" },
  "Agarbathi Brass Stand Small": { sheet: "FRESHITEM", type: "PACKED" },
  "Thattam Medium (Brass Plate)": { sheet: "FRESHITEM", type: "PACKED" },
  "Para Brass Small (Rice Measuring Vessel)": { sheet: "FRESHITEM", type: "PACKED" },
  "Kindi Brass Small (Traditional Water Pot)": { sheet: "FRESHITEM", type: "PACKED" },
  "Vilakku Small (Brass Lamp)": { sheet: "FRESHITEM", type: "PACKED" },
  "Ponnada (Shawl)": { sheet: "FRESHITEM", type: "PACKED" },
  "Melvesthi  / Naaree / Aag Vasthram - 2 Inch": { sheet: "FRESHITEM", type: "PACKED" },
  "999 Kara Mund - Double Dhotie (KPR Mills)": { sheet: "FRESHITEM", type: "PACKED" },
  "Kasavu Sandal Double Mund (SMA Brand)": { sheet: "FRESHITEM", type: "PACKED" },
  "Kerala Thorth Big (30*60)": { sheet: "FRESHITEM", type: "PACKED" },
  "Biryani Essence (Bush)": { sheet: "FRESHITEM", type: "PACKED" },
  "SAS Banana Plastic Leaf": { sheet: "FRESHITEM", type: "PACKED" },
  "Sev Maker - Brass (Richlin)": { sheet: "FRESHITEM", type: "PACKED" },
  "Rice Kalam No. 4 with Lid": { sheet: "FRESHITEM", type: "PACKED" },
  "Rice Kalam No. 3 with Lid": { sheet: "FRESHITEM", type: "PACKED" },
  "Common Cook 3/1 (Sun Brand Kairali)": { sheet: "FRESHITEM", type: "PACKED" },
  "Cheratta Puttu Maker Big (Sun Brand Kairali)": { sheet: "FRESHITEM", type: "PACKED" },
  "Pressure Puttu Maker (Sun Brand Kairali)": { sheet: "FRESHITEM", type: "PACKED" },
  "Puttu Kodam Big Gold  - Joint Free (Sun Brand Kairali)": { sheet: "FRESHITEM", type: "PACKED" },
  "Applam (Aachi)": { sheet: "FRESHITEM", type: "PACKED" },
  "Pickle Powder (Eastern)": { sheet: "FRESHITEM", type: "PACKED" },
  "Turmeric Powder (Eastern)": { sheet: "FRESHITEM", type: "PACKED" },
  "Sambar Powder (Eastern)": { sheet: "FRESHITEM", type: "PACKED" },
  "Black Pepper Powder (Eastern)": { sheet: "FRESHITEM", type: "PACKED" },
  "Kashmiri Chilly (Eastern)": { sheet: "FRESHITEM", type: "PACKED" },
  "Garam Masala (Eastern)": { sheet: "FRESHITEM", type: "PACKED" },
  "Coriander Powder (Eastern)": { sheet: "FRESHITEM", type: "PACKED" },
  "Chilly Powder (Eastern)": { sheet: "FRESHITEM", type: "PACKED" },
  "Fish Masala (Eastern)": { sheet: "FRESHITEM", type: "PACKED" },
  "Meat Masala (Eastern)": { sheet: "FRESHITEM", type: "PACKED" },
  "Chicken Masala (Eastern)": { sheet: "FRESHITEM", type: "PACKED" },
  "Adimali Coffee (Eastern)": { sheet: "FRESHITEM", type: "PACKED" },
  "Crushed Chilly": { sheet: "FRESHITEM", type: "PACKED" },
  "Perumjeerakam / Fennel Seeds / Saunf (Quality Brand)": { sheet: "FRESHITEM", type: "PACKED" },
  "Jeerakam Seeds / Cumin Seeds (Quality Brand)": { sheet: "FRESHITEM", type: "PACKED" },
  "Uluva Seeds / Fenugreek Seeds (Quality Brand)": { sheet: "FRESHITEM", type: "PACKED" },
  "Mustard Seeds (Pepko Brand)": { sheet: "FRESHITEM", type: "PACKED" },
  "White Peas / Vella Pattani": { sheet: "FRESHITEM", type: "PACKED" },
  "Pottu Kadala / Chutney Dal": { sheet: "FRESHITEM", type: "PACKED" },
  "Kadala Paripu / Chana Dal": { sheet: "FRESHITEM", type: "PACKED" },
  "Payasam Paripu / Moong Duli": { sheet: "FRESHITEM", type: "PACKED" },
  "Cherupayar / Moong Dal /Green Sabooth": { sheet: "FRESHITEM", type: "PACKED" },
  "Kadala / Kala Chana": { sheet: "FRESHITEM", type: "PACKED" },
  "Sambar Parippu/ Dal Big Unpolished": { sheet: "FRESHITEM", type: "PACKED" },
  "Van Payar/ Kerala Lobia": { sheet: "FRESHITEM", type: "PACKED" },
  "Ragi Powder (Baby Vita)": { sheet: "FRESHITEM", type: "PACKED" },
  "Rice Banana Powder (Baby Vita)": { sheet: "FRESHITEM", type: "PACKED" },
  "Banana Powder (Baby Vita)": { sheet: "FRESHITEM", type: "PACKED" },
  "NS Rice Ada": { sheet: "FRESHITEM", type: "PACKED" },
  "LG Kayam Powder/ Asafoetida Powder": { sheet: "FRESHITEM", type: "PACKED" },
  "LG Kayam Katta/ Asafoetida Slab": { sheet: "FRESHITEM", type: "PACKED" },
  "NS Kayam Powder/ Asafoetida Powder": { sheet: "FRESHITEM", type: "PACKED" },
  "NS Kayam Katta/ Asafoetida Slab": { sheet: "FRESHITEM", type: "PACKED" },
  "Dheedhi Shampoo": { sheet: "FRESHITEM", type: "PACKED" },
  "Dhathri Hair Care Oil (White)": { sheet: "FRESHITEM", type: "PACKED" },
  "Eladi Chewable Tablet": { sheet: "FRESHITEM", type: "PACKED" },
  "Gingelly/Sesame Oil (Idhayam Brand)": { sheet: "FRESHITEM", type: "PACKED" },
  "Gingelly Oil (R G Brand)": { sheet: "FRESHITEM", type: "PACKED" },
  "Gundur Round Dry Chilly": { sheet: "FRESHITEM", type: "PACKED" },
  "Red Chilly": { sheet: "FRESHITEM", type: "PACKED" },
  "Kondattam Curd Chilly": { sheet: "FRESHITEM", type: "PACKED" },
  "Panakalkandam": { sheet: "FRESHITEM", type: "PACKED" },
  "Jaggery Unda": { sheet: "FRESHITEM", type: "PACKED" },
  "Karupatti / Palm Jaggery": { sheet: "FRESHITEM", type: "PACKED" },
  "Jaggery Powder": { sheet: "FRESHITEM", type: "PACKED" },
  "Chukku Kappi - 1 Cube One Cup": { sheet: "FRESHITEM", type: "PACKED" },
  "Manthi Arabian Kit (Shappad)": { sheet: "FRESHITEM", type: "PACKED" },
  "Pathimugam (Shappad)": { sheet: "FRESHITEM", type: "PACKED" },
  "Dahashamini (Shappad)": { sheet: "FRESHITEM", type: "PACKED" },
  "Rasakootu (Shappad)": { sheet: "FRESHITEM", type: "PACKED" },
  "Kissmiss (Shappad)": { sheet: "FRESHITEM", type: "PACKED" },
  "Cashew Nut (Shappad)": { sheet: "FRESHITEM", type: "PACKED" },
  "Yeast (Shappad)": { sheet: "FRESHITEM", type: "PACKED" },
  "Tuna Flakes In Water (Tasty Nibbles RTE)": { sheet: "FRESHITEM", type: "PACKED" },
  "Sardine In Sunflower Oil (Tasty Nibbles RTE)": { sheet: "FRESHITEM", type: "PACKED" },
  "Tuna Chunks In Sunflower Oil (Tasty Nibbles RTE)": { sheet: "FRESHITEM", type: "PACKED" },
  "Avial Curry (Tasty Nibbles RTE)": { sheet: "FRESHITEM", type: "PACKED" },
  "Sambar Curry (Tasty Nibbles RTE)": { sheet: "FRESHITEM", type: "PACKED" },
  "Kappa Puzhukku (Tasty Nibbles RTE)": { sheet: "FRESHITEM", type: "PACKED" },
  "Fish Peera (Tasty Nibbles RTE)": { sheet: "FRESHITEM", type: "PACKED" },
  "Chettinad Pepper Chicken (Tasty Nibbles RTE)": { sheet: "FRESHITEM", type: "PACKED" },
  "Kuttanadan Duck Roast (Tasty Nibbles RTE)": { sheet: "FRESHITEM", type: "PACKED" },
  "Erachi Meat Roast (Tasty Nibbles RTE)": { sheet: "FRESHITEM", type: "PACKED" },
  "Roasted Coconut Paste (Tasty Nibbles RTE)": { sheet: "FRESHITEM", type: "PACKED" },
  "Kerala Fish Curry in Coconut Oil (Tasty Nibbles RTE)": { sheet: "FRESHITEM", type: "PACKED" },
  "Synthetic Vinegar (Tasty Nibbles)": { sheet: "FRESHITEM", type: "PACKED" },
  "Instant Vermicelli Payasam Mix (Tasty Nibbles)": { sheet: "FRESHITEM", type: "PACKED" },
  "Kerala Instant Palada Payasam Mix (Tasty Nibbles)": { sheet: "FRESHITEM", type: "PACKED" },
  "Instant Idiyappam Pouch (Tasty Nibbles)": { sheet: "FRESHITEM", type: "PACKED" },
  "Milma Ghee": { sheet: "FRESHITEM", type: "PACKED" },
  "Ponni Rice (SS Rajbhogam Premium Repacked)": { sheet: "FRESHITEM", type: "PACKED" },
  "Idli Rice (TG Brand, Repacked)": { sheet: "FRESHITEM", type: "PACKED" },
  "Vattayappam Podi (Ponkathir)": { sheet: "FRESHITEM", type: "PACKED" },
  "Chemba Puttu Podi (Ponkathir)": { sheet: "FRESHITEM", type: "PACKED" },
  "Appam Podi (Ponkathir)": { sheet: "FRESHITEM", type: "PACKED" },
  "Roasted Rava (Ponkathir)": { sheet: "FRESHITEM", type: "PACKED" },
  "Puttu Podi (Ponkathir)": { sheet: "FRESHITEM", type: "PACKED" },
  "Red Bran Rice Unpolished (Robinfood Brand Repacked)": { sheet: "FRESHITEM", type: "PACKED" },
  "Aval Thin Beaten (Pavizham) Matta Rice Nylon": { sheet: "FRESHITEM", type: "PACKED" },
  "Aval Roasted (Pavizham) Matta Rice Flakes": { sheet: "FRESHITEM", type: "PACKED" },
  "Jaya Rice (Pavizham Repacked)": { sheet: "FRESHITEM", type: "PACKED" },
  "Vadi Rice (Pavizham Repacked) / Long Grain": { sheet: "FRESHITEM", type: "PACKED" },
  "Unda Rice (Pavizham Repacked)/ Short Grain": { sheet: "FRESHITEM", type: "PACKED" },
  "Brown Paper Carry Bag": { sheet: "MISC", type: null },
  "Unnakaya": { sheet: "PROD", type: "SNACK" },
  "Kerala Chicken Samosa": { sheet: "PROD", type: "SNACK" },
  "Chicken Pickle (Less Salty Kerala Home-made)": { sheet: "PACKED", type: "PICKLE" },
  "Kerala Veg Samosa": { sheet: "PROD", type: "SNACK" },
  "Sugiyan": { sheet: "PROD", type: "SNACK" },
  "Uzhunnu Vada": { sheet: "PROD", type: "SNACK" },
  "Chicken Roll": { sheet: "PROD", type: "SNACK" },
  "Chicken Cutlet": { sheet: "PROD", type: "SNACK" },
  "Mix Veg Puffs": { sheet: "PROD", type: "PUFFS" },
  "Parippu Vada": { sheet: "PROD", type: "SNACK" },
  "Chicken Puffs": { sheet: "PROD", type: "PUFFS" },
  "Egg Puffs": { sheet: "PROD", type: "PUFFS" },
  "Delivery Charge": { sheet: "MISC", type: null },
  "Juice": { sheet: "FRESHITEM", type: "PACKED" },
  "Blueberry Muffin": { sheet: "PROD", type: "MUFFIN" },
  "Chocolate Muffin": { sheet: "PROD", type: "MUFFIN" },
  "Pineapple Muffin": { sheet: "PROD", type: "MUFFIN" },
  "Chocolate Brownie": { sheet: "PROD", type: "MUFFIN" },
  "Exotic Rum Plum Cake": { sheet: "PACKED", type: "CAKE" },
  "Sharkara Varatti": { sheet: "PACKED", type: "SNACK" },
  "Inji Mittai Bottle Small (Petti Kada Mittai)": { sheet: "PACKED", type: "CANDY" },
  "Grated Kerala Coconut": { sheet: "PROD", type: "EXTRA" },
  "Cleaned Nadan Cheriya Ulli (Small Onion)": { sheet: "PROD", type: "EXTRA" },
  "Cleaned Nadan Cheriya Ulli & Grated Kerala Coconut": {
    sheet: "PROD",
    type: "EXTRA",
    originalName: "Cleaned Nadan Cheriya Ulli (300g) & Grated Kerala Coconut (200g)"
  },
  "Tapioca Chips Round Spicy": { sheet: "PACKED", type: "CHIPS" },
  "Tapioca Chips Round Salted": { sheet: "PACKED", type: "CHIPS" },
  "Chilli Onion Murukku": { sheet: "PACKED", type: "MURUKKU" },
  "Chilli Garlic Murukku": { sheet: "PACKED", type: "MURUKKU" },
  "Madhura Seva": { sheet: "PACKED", type: "SNACK" },
  "Tapioca Chips Stick Spicy": { sheet: "PACKED", type: "CHIPS" },
  "Payyoli Mixture": { sheet: "PACKED", type: "MIXTURE" },
  "Stick Murukku Salted": { sheet: "PACKED", type: "MURUKKU" },
  "Masala Peanut": { sheet: "PACKED", type: "SNACK" },
  "Bombay Mixture": { sheet: "PACKED", type: "MIXTURE" },
  "Super Thin Banana Chips Coconut Oil (Pudina)": { sheet: "PACKED", type: "BANANA" },
  "Kuzhalappam Sweet": { sheet: "PACKED", type: "SNACK" },
  "Ripened Banana / Pazham Chips": { sheet: "PACKED", type: "CHIPS" },
  "Round Murukku Salted": { sheet: "PACKED", type: "MURUKKU" },
  "Roasted Peanut": { sheet: "PACKED", type: "SNACK" },
  "Super Thin Banana Chips Coconut Oil (Indian Spicy Masala)": { sheet: "PACKED", type: "BANANA" },
  "Stick Murukku Masala": { sheet: "PACKED", type: "MURUKKU" },
  "Kerala Spicy Mixture": { sheet: "PACKED", type: "MIXTURE" },
  "Kerala White Mixture": { sheet: "PACKED", type: "MIXTURE" },
  "Round Murukku Masala": { sheet: "PACKED", type: "MURUKKU" },
  "Super Thin Banana Chips Coconut Oil (Pepper & Salt)": { sheet: "PACKED", type: "BANANA" },
  "Avalose Unda": { sheet: "PACKED", type: "SNACK" },
  "Ribbon Pakkavada": { sheet: "PACKED", type: "SNACK" },
  "Tapioca Chips Stick Salted": { sheet: "PACKED", type: "CHIPS" },
  "Kara Seva": { sheet: "PACKED", type: "SNACK" },
  "Super Thin Banana Chips Coconut Oil (Classic Salted)": { sheet: "PACKED", type: "BANANA" },
  "Jackfruit / Chakka Chips (Made in Coconut Oil)": { sheet: "PACKED", type: "SNACK" },
  "Puli Sip Up Bottle Small (Petti Kada Mittai)": { sheet: "PACKED", type: "CANDY" },
  "Jeerka Mittai Bottle Small ( Petti Kada Mittai)": { sheet: "PACKED", type: "CANDY" },
  "Dry Prawns Roast (Chemmeen Roast)": { sheet: "PACKED", type: "CHUTNEY" },
  "Gun Powder Chutney (Idli/Dosa Molag Powder)": { sheet: "PACKED", type: "CHUTNEY" },
  "Coconut Chutney Powder (Thenga Chamanthi Podi)": { sheet: "PACKED", type: "CHUTNEY" },
  "Blackened Gooseberry Pickle (Kari Nellika)": { sheet: "PACKED", type: "CHUTNEY" },
  "Prawns Chutney Powder (Chemmeen Chammanthi Podi)": { sheet: "PACKED", type: "CHUTNEY" },
  "Dry Chilli Chutney (Chuttu Aracha Mulaku Chammanthi)": { sheet: "PACKED", type: "CHUTNEY" },
  "Idi Erachi (Pounded Meat)": { sheet: "PACKED", type: "CHUTNEY" },
  "Kerala Laddu": { sheet: "PACKED", type: "BAKERY" },
  "Dilkush / Coconut Bun": { sheet: "PACKED", type: "BAKERY" },
  "Sweet Porotta": { sheet: "PACKED", type: "BAKERY" },
  "Sweet Bun / Soft": { sheet: "PACKED", type: "BAKERY" },
  "Cream Bun": { sheet: "PACKED", type: "BAKERY" },
  "Kerala Bakery Soft Bread (Pacha Rotti)": { sheet: "PACKED", type: "BAKERY" },
  "Oats & Raisins Cookie": { sheet: "PROD", type: "COOKIE" }
}; 