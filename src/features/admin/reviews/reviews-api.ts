import { apiRequest } from "../../../lib/api/client";
import type { ReviewAudit, ReviewPage } from "../../../lib/contracts/reviews";
export const adminReviewsApi = {
  list: (page: number, status: string, rating: string, productId: string) =>
    apiRequest<ReviewPage>(
      `/reviews/admin?page=${page}&status=${status}${rating ? `&rating=${rating}` : ""}${productId ? `&productId=${encodeURIComponent(productId)}` : ""}`,
      { method: "GET" },
    ),
  moderate: (id: string, action: string, reason: string, version: number) =>
    apiRequest(`/reviews/admin/${id}/moderate`, {
      body: { action, reason, version },
    }),
  audit: (id: string) =>
    apiRequest<{ events: ReviewAudit[] }>(`/reviews/admin/${id}/audit`, {
      method: "GET",
    }),
};
