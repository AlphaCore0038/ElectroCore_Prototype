export type ProductCategory =
  | "AUDIO"
  | "PERIPHERALS"
  | "POWER"
  | "CABLES"
  | "STORAGE"
  | "ACCESSORIES";

export type ProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

export type ProductAttributes = {
  brand: string;
  model?: string;
  color?: string;
  connectivity?: "wired" | "wireless" | "bluetooth" | "usb-c" | "usb-a";
  warrantyMonths?: number;
  specs?: Record<string, string | number>;
  compatibleWith?: string[];
};

export type CatalogProduct = {
  id: string;
  merchantId: string;
  slug: string;
  sku: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  currency: string;
  stock: number;
  status: ProductStatus;
  imageUrl: string | null;
  attributes: ProductAttributes | null;
  createdAt: string;
  updatedAt: string;
};

export type SearchParams = {
  q?: string;
  category?: ProductCategory;
  inStock?: boolean;
  limit?: number;
  cursor?: string;
  maxPrice?: number;
};

export type SearchResult = {
  products: CatalogProduct[];
  nextCursor: string | null;
};

export type Availability = {
  id: string;
  slug: string;
  stock: number;
  status: ProductStatus;
  price: number;
  currency: string;
  available: boolean;
};
