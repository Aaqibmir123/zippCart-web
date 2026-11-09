import { apiRequest } from "../../../lib/api/client";

import type {
  SellerProduct,
  SellerProductSummary,
  SellerProductInput,
} from "../../../lib/contracts/product";
export type {
  ProductModeration,
  SellerProduct,
  SellerProductSummary,
  SellerProductInput,
  ProductColor,
} from "../../../lib/contracts/product";

export const productApi = {
  list: (page: number, archived = false) =>
    apiRequest<{
      products: SellerProductSummary[];
      total: number;
      nextPage: number | null;
      lifecycleEnabled?: boolean;
    }>(`/seller/products?page=${page}${archived ? "&archived=true" : ""}`, {
      method: "GET",
    }),
  get: (id: string) =>
    apiRequest<{ product: SellerProduct }>(
      `/seller/products/${encodeURIComponent(id)}`,
      { method: "GET" },
    ),
  create: (input: SellerProductInput) =>
    apiRequest<{ product: SellerProduct }>("/seller/products", {
      method: "POST",
      body: input,
      timeoutMs: 60000,
    }),
  update: (id: string, input: SellerProductInput) =>
    apiRequest<{ product: SellerProduct }>(
      `/seller/products/${encodeURIComponent(id)}`,
      { method: "PUT", body: input, timeoutMs: 60000 },
    ),
  inventory: (
    id: string,
    body: {
      stock: number;
      variantStock: NonNullable<SellerProduct["variantStock"]>;
      expectedInventoryRevision: number;
    },
  ) =>
    apiRequest<{ product: SellerProductSummary }>(
      `/seller/products/${encodeURIComponent(id)}/inventory`,
      { method: "PATCH", body },
    ),
  setStatus: (id: string, active: boolean) =>
    apiRequest<{ product: SellerProductSummary }>(
      `/seller/products/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: { active } },
    ),
  archive: (id: string) =>
    apiRequest(`/seller/products/${encodeURIComponent(id)}/archive`, {
      method: "POST",
    }),
  restore: (id: string) =>
    apiRequest(`/seller/products/${encodeURIComponent(id)}/restore`, {
      method: "POST",
    }),
  remove: (id: string) =>
    apiRequest<void>(`/seller/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};
