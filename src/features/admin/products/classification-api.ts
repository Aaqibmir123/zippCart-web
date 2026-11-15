import { apiRequest } from "../../../lib/api/client";
import {
  categoryPath,
  type CatalogCategory,
} from "../../../lib/products/category-taxonomy";

export type ClassificationProduct = {
  id: string;
  name: string;
  category: string;
  categoryId: string | null;
  description: string;
  sizes: string[];
  coverImage: string | null;
  price: number;
  stock: number;
  storeName: string;
  originalCategory: string;
  customCategory: string;
  status: string;
  reason: string;
  revision: number;
  allowCatalogChange?: boolean;
};
export type ClassificationPage = {
  enabled: boolean;
  products: ClassificationProduct[];
  total: number;
  nextPage: number | null;
};
export const classificationApi = {
  list: (status: "pending" | "all", page: number, signal?: AbortSignal) =>
    apiRequest<ClassificationPage>(
      `/admin/product-classifications?${new URLSearchParams({ status, page: String(page) })}`,
      { method: "GET", signal },
    ),
  save: (
    id: string,
    body: {
      categoryId: string;
      revision: number;
      audienceConfirmed: true;
      reason: string;
    },
  ) =>
    apiRequest<{ product: ClassificationProduct }>(
      `/admin/product-classifications/${encodeURIComponent(id)}`,
      { method: "PATCH", body },
    ),
};

export function classificationOptions(
  nodes: CatalogCategory[],
  category?: string,
) {
  return nodes
    .filter(
      (node) =>
        (!category || node.legacyCategory === category) &&
        !nodes.some((child) => child.parentId === node.id),
    )
    .map((node) => ({ node, path: categoryPath(nodes, node.id) }))
    .filter(({ path }) =>
      path.some((node) => Number.isInteger(node.customerPosition)),
    )
    .map(({ node, path }) => ({
      value: node.id,
      label: path.map((part) => part.name).join(" / "),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
