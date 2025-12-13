import { Product } from "../types";

const API_URL = "https://app.polymaker.com/api/color_data.php";

// ------------------------------------------------------------------
// TYPES
// ------------------------------------------------------------------

type ProgressCallback = (status: string, count: number) => void;
type ProductCallback = (product: Product) => void;

// ------------------------------------------------------------------
// PARSING HELPERS
// ------------------------------------------------------------------

const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

const parseCategory = (val: string, productName: string): string => {
  const v = (val || "").toUpperCase();
  const n = (productName || "").toUpperCase();
  
  if (v.includes('PLA') || n.includes('PLA')) return 'PLA';
  if (v.includes('PETG') || n.includes('PETG')) return 'PETG';
  if (v.includes('ABS') || n.includes('ABS')) return 'ABS';
  if (v.includes('ASA') || n.includes('ASA')) return 'ASA';
  if (v.includes('TPU') || v.includes('FLEX') || n.includes('TPU')) return 'TPU';
  if (v.includes('NYLON') || v.includes('PA6') || v.includes('PA12') || n.includes('NYLON')) return 'Nylon';
  if (v.includes('PC') || n.includes('PC')) return 'PC';
  if (v.includes('PVB') || n.includes('PVB')) return 'PVB';
  if (v.includes('WOOD') || n.includes('WOOD')) return 'Wood';
  return 'Other';
};

// Helper to recursively find an array in a nested object or return dictionary values
const findArrayInObject = (obj: any): any[] | null => {
  if (!obj) return null;
  if (Array.isArray(obj)) return obj;
  
  if (typeof obj === 'object') {
    // Check common keys first
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.products)) return obj.products;
    if (Array.isArray(obj.items)) return obj.items;
    
    // Check if it's a dictionary of items (e.g. {"0": {name...}, "1": {name...}})
    const values = Object.values(obj);
    if (values.length > 0 && typeof values[0] === 'object' && values[0] !== null) {
      // Simple heuristic: if the first value looks like a product (has name or hex), treat as list
      const first = values[0] as any;
      if (first.product_name || first.name || first.hex_code || first.hex || first.color_name) {
        return values;
      }
    }
  }
  return null;
};

// ------------------------------------------------------------------
// NETWORK HELPERS
// ------------------------------------------------------------------

async function fetchWithTimeout(url: string, timeoutMs: number = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// 1. Try Direct
const tryDirect = async (url: string) => {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const text = await res.text();
  
  // Try to sanitize JSON (remove BOM or PHP warnings)
  const jsonStart = text.indexOf('[');
  const objStart = text.indexOf('{');
  // Find the first occurrence of { or [
  let start = -1;
  if (jsonStart !== -1 && objStart !== -1) start = Math.min(jsonStart, objStart);
  else if (jsonStart !== -1) start = jsonStart;
  else if (objStart !== -1) start = objStart;
  
  if (start !== -1) {
    return JSON.parse(text.substring(start));
  }
  return JSON.parse(text);
};

// 2. Try AllOrigins (JSON Wrapper mode)
const tryAllOrigins = async (url: string) => {
  const target = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetchWithTimeout(target);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const data = await res.json();
  if (data.contents) {
    try {
      return JSON.parse(data.contents);
    } catch {
      return data.contents;
    }
  }
  throw new Error("No contents in AllOrigins response");
};

// 3. Try CORSProxy.io
const tryCorsProxy = async (url: string) => {
  const target = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  const res = await fetchWithTimeout(target);
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return await res.json();
};

async function fetchJsonRobust(url: string): Promise<any> {
  // Strategy: AllOrigins is usually most reliable for PHP endpoints that lack CORS headers
  try { return await tryAllOrigins(url); } catch (e) { console.log("AllOrigins failed, trying Direct..."); }
  try { return await tryDirect(url); } catch (e) { console.log("Direct failed, trying CORSProxy..."); }
  try { return await tryCorsProxy(url); } catch (e) { console.log("CORSProxy failed."); }
  
  throw new Error("Unable to connect to Polymaker API via any proxy.");
}

// ------------------------------------------------------------------
// MAIN EXPORT
// ------------------------------------------------------------------

export const fetchPolymakerData = async (
  onProductFound: ProductCallback,
  onProgress: ProgressCallback
) => {
  let count = 0;
  onProgress("Connecting to API...", 0);

  const rawData = await fetchJsonRobust(API_URL);
  const items = findArrayInObject(rawData);
  
  if (!items || items.length === 0) {
    throw new Error("Connected to API but found no product list in response.");
  }
  
  onProgress(`Processing ${items.length} items...`, 0);
  const processedIds = new Set<string>();

  for (const item of items) {
    if (!item) continue;

    // Field Mapping based on observed Polymaker API structure and user requirements
    const product = item.product_name || item.product || item.title || "Unknown Product";
    const name = item.color_name || item.name || item.color || "Unknown Color";
    const rawCategoryField = item.material || item.material_type || item.category || item.type || "";
    const category = parseCategory(rawCategoryField, product);
    const url = item.product_url || item.url || item.link || "https://us.polymaker.com";
    
    // TD (Transmission Distance) Handling
    let td: string | null = null;
    if (item.transmission_distance !== undefined && item.transmission_distance !== null && item.transmission_distance !== "") {
      td = String(item.transmission_distance);
    } else if (item.td !== undefined && item.td !== null && item.td !== "") {
      td = String(item.td);
    }
    if (td === "null") td = null; // Clean up string "null"

    // Hex Handling
    // Strictly checking provided keys. Removed guessing logic.
    let rawHex = item.hex_code || item.hex || item.hexcodes || item.color_hex || item.color_code || item.value;
    
    let hex = rawHex ? rawHex.toString().trim() : null;

    if (hex) {
      if (!hex.startsWith('#')) hex = `#${hex}`;
      
      // Validate Hex
      if (/^#([0-9A-F]{3,8})$/i.test(hex)) {
          // Create unique ID
          const id = item.id ? String(item.id) : `${normalize(product)}-${normalize(name)}`;
          
          if (!processedIds.has(id)) {
            processedIds.add(id);

            onProductFound({
              id,
              product,
              name,
              category,
              hex,
              url,
              td
            });
            count++;
          }
      }
    }
    
    if (count % 20 === 0) {
      onProgress(`Loaded ${count} colors...`, count);
      await new Promise(r => setTimeout(r, 0));
    }
  }

  if (count === 0) {
      throw new Error("API response parsed but no valid hex codes were found.");
  }
  
  onProgress("Done!", count);
};