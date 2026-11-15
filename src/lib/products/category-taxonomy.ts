import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../api/client";
import { createApiError, isApiError } from "../api/api-error";

export type CatalogCategory = {
  id: string;
  parentId: string | null;
  name: string;
  legacyCategory: string;
  image: string | null;
  position: number;
  revision: number;
  customerPosition?: number;
};

export function useCategoryTaxonomy(enabled = true) {
  return useQuery({
    queryKey: ["category-taxonomy"],
    enabled,
    staleTime: 30000,
    queryFn: async ({ signal }) => {
      try {
        const result = await apiRequest<{ categories: CatalogCategory[] }>(
          "/products/taxonomy",
          { method: "GET", signal },
        );
        if (
          !result ||
          !Array.isArray(result.categories) ||
          result.categories.some(
            (node) =>
              !node ||
              !/^[a-fA-F0-9]{24}$/.test(node.id) ||
              (node.parentId !== null &&
                !/^[a-fA-F0-9]{24}$/.test(node.parentId)) ||
              typeof node.name !== "string" ||
              !node.name.trim() ||
              typeof node.legacyCategory !== "string" ||
              !Number.isFinite(node.position),
          )
        ) {
          throw createApiError("The server returned invalid category data.", {
            kind: "invalid_response",
            status: 200,
          });
        }
        return { categories: result.categories, supported: true };
      } catch (error) {
        // Older servers send this path through their product ID validator.
        const legacyIdRoute =
          isApiError(error) &&
          error.status === 400 &&
          error.message === "Invalid request." &&
          error.issues?.request?.length === 1 &&
          error.issues.request[0] ===
            "Invalid string: must match pattern /^[a-fA-F0-9]{24}$/";
        if (isApiError(error) && (error.status === 404 || legacyIdRoute))
          return { categories: [], supported: false };
        throw error;
      }
    },
  });
}

export function categoryPath(nodes: CatalogCategory[], id?: string | null) {
  const path: CatalogCategory[] = [];
  const seen = new Set<string>();
  let current = nodes.find((node) => node.id === id);
  while (current && !seen.has(current.id) && path.length < 8) {
    seen.add(current.id);
    path.unshift(current);
    if (current.parentId === null) return path;
    current = nodes.find((node) => node.id === current?.parentId);
  }
  return [];
}
