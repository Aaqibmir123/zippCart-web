import { apiRequest } from "../../../lib/api/client";
import type {
  ProductModeration,
  SellerProduct,
} from "../../../lib/contracts/product";
export type ReviewFilter =
  | "pending"
  | "approved"
  | "rejected"
  | "legacy"
  | "all";
export type ReviewSummary = ProductModeration & {
  id: string;
  name: string;
  category: string;
  customCategory: string;
  price: number;
  mrp: number;
  coverImage: string | null;
  storeId: string;
  storeName: string;
  active: boolean;
};
export type ProductReview = ReviewSummary & {
  live: SellerProduct | null;
  submitted: SellerProduct;
  inventoryChanged: boolean;
  reviewedBy: string | null;
};
export const productReviewApi = {
  list: (
    status: ReviewFilter,
    search: string,
    storeId: string,
    page: number,
  ) => {
    const params = new URLSearchParams({
      status,
      search,
      page: String(page),
      ...(storeId ? { storeId } : {}),
    });
    return apiRequest<{ products: ReviewSummary[]; nextPage: number | null }>(
      `/admin/products?${params}`,
      { method: "GET" },
    );
  },
  detail: (id: string) =>
    apiRequest<{ product: ProductReview }>(`/admin/products/${id}`, {
      method: "GET",
    }),
  review: (
    id: string,
    submissionVersion: number,
    decision: "approved" | "rejected",
    reason: string,
  ) =>
    apiRequest(`/admin/products/${id}/review`, {
      body: { submissionVersion, decision, reason },
    }),
};
