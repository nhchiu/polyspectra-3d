export interface Product {
  id: string;
  product: string;    // e.g., "PolyLite PLA" (formerly name)
  name: string;       // e.g., "Electric Blue" (formerly colorName)
  category: string;   // e.g., "PLA", "PETG" (formerly material)
  hex: string;        // e.g., "#0000FF"
  url: string;        // Product page URL
  td: string | null;    // Transmission distance or "null"
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}