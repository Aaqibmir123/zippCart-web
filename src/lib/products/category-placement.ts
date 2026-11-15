import { categoryPath, type CatalogCategory } from "./category-taxonomy";

export const productCategories = [
  "Fashion",
  "Watches",
  "Beauty",
  "Home",
  "Accessories",
  "Electronics",
  "Other",
];

export type CategoryPlacement = "confirmed" | "needs-classification";
export type ReviewPlacementInput = {
  category: string;
  categoryId: string | null;
  categoryPlacement: CategoryPlacement;
  customCategory: string;
  confirmed: true;
};
export function placementError(
  nodes: CatalogCategory[],
  category: string,
  id: string | null,
  status: CategoryPlacement,
) {
  if (status === "needs-classification")
    return id
      ? "Clear the nested category when audience needs classification."
      : null;
  if (!id)
    return "Choose a final product category, or select Needs classification.";
  const path = categoryPath(nodes, id);
  if (!path.length || path[0].legacyCategory !== category)
    return "Load and choose a valid product category.";
  if (nodes.some((node) => node.parentId === id))
    return "Choose a final leaf category, not a category group.";
  if (
    category === "Fashion" &&
    nodes.some(
      (node) =>
        node.legacyCategory === category &&
        Number.isInteger(node.customerPosition),
    ) &&
    !path.some((node) => Number.isInteger(node.customerPosition))
  )
    return "Choose a confirmed customer audience, or select Needs classification.";
  return null;
}
export function placementSummary(
  nodes: CatalogCategory[],
  id: string | null,
  status: CategoryPlacement,
) {
  if (status === "needs-classification")
    return "Needs classification: available through Shop All after approval.";
  const path = categoryPath(nodes, id),
    audience = path.findIndex((node) =>
      Number.isInteger(node.customerPosition),
    );
  const start =
    audience >= 0
      ? audience
      : path.length > 1 && path[0].legacyCategory === "Fashion"
        ? 1
        : 0;
  return `Customer placement: ${
    path
      .slice(start)
      .map((node) => node.name)
      .join(" → ") || "Choose a final category"
  }`;
}
