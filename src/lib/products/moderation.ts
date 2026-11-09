import type { ProductModeration } from "../../features/seller/products/product-api";
export function moderationLabel(
  product: ProductModeration & { active: boolean },
) {
  if (product.archivedAt) return "Archived";
  if (!product.active) return "Inactive";
  if (product.moderationStatus === "rejected") return "Rejected";
  if (product.moderationStatus === "pending")
    return product.approvedVersion ? "Changes Pending" : "Pending Review";
  return product.approvedVersion ? "Approved" : "Pending Review";
}
