import { apiRequest } from "../../../lib/api/client";
import type { ReviewPage } from "../../../lib/contracts/reviews";
export const sellerReviewsApi = {
  list: (page: number, status: string, rating: string, productId: string) =>
    apiRequest<ReviewPage>(
      `/reviews/seller?page=${page}&status=${status}${rating ? `&rating=${rating}` : ""}${productId ? `&productId=${encodeURIComponent(productId)}` : ""}`,
      { method: "GET" },
    ),
  reply: (
    id: string,
    comment: string,
    version: number,
    policyVersion: string,
  ) =>
    apiRequest(`/reviews/seller/${id}/reply`, {
      body: { comment, version, policyVersion },
    }),
};
