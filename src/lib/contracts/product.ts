export type ProductModeration = {
  moderationStatus?: "pending" | "approved" | "rejected" | "legacy";
  approvedVersion?: number;
  submissionVersion?: number;
  submittedAt?: string | null;
  rejectionReason?: string;
  reviewedAt?: string | null;
  archivedAt?: string | null;
};
export type SellerProduct = ProductModeration & {
  liveInventory?: {
    stock: number;
    variantStock: { color: string; size: string; stock: number }[];
  };
  publicVersion?: SellerProduct | null;
  canDelete?: boolean;
  id: string;
  name: string;
  category: string;
  customCategory: string;
  description: string;
  brand: string;
  sku: string;
  sizes: string[];
  images: string[];
  colors: ProductColor[];
  price: number;
  mrp: number;
  stock: number;
  exchangeReserved?: number;
  inventoryRevision?: number;
  variantStock?: { color: string; size: string; stock: number }[];
  active: boolean;
};

export type ProductColor = { name: string; images: string[] };

export type SellerProductSummary = Pick<
  SellerProduct,
  | "id"
  | "name"
  | "category"
  | "customCategory"
  | "brand"
  | "sku"
  | "price"
  | "mrp"
  | "stock"
  | "active"
  | "exchangeReserved"
  | "canDelete"
> &
  ProductModeration & { coverImage: string | null };

export type SellerProductInput = Omit<
  SellerProduct,
  | "id"
  | "sku"
  | "exchangeReserved"
  | "inventoryRevision"
  | "publicVersion"
  | "liveInventory"
  | "canDelete"
  | keyof ProductModeration
> & {
  sku: string;
  expectedInventoryRevision?: number;
  creationKey?: string;
  expectedSubmissionVersion?: number;
};
