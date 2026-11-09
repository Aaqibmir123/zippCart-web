import { apiRequest } from "../../../lib/api/client";
import type { SellerInvitationInput } from "./invitation-model";
export type SellerAccount = {
  id: string;
  name: string;
  phone: string;
  email: string;
  recoveryVerified: boolean;
  storeName: string;
  category: string;
  address: string;
  accountStatus: "change_required" | "ready" | "password_not_set";
  onboardingStatus: "not_started" | "pending" | "approved" | "rejected";
  createdAt: string;
  storeId: string | null;
  storeActive: boolean;
  canRecoverPassword: boolean;
};
export type SellerFilters = {
  q: string;
  account: string;
  onboarding: string;
  page: number;
};
export const sellersApi = {
  list: (filters: SellerFilters) =>
    apiRequest<{
      sellers: SellerAccount[];
      total: number;
      hasMore: boolean;
      pageSize: number;
    }>(
      "/admin/sellers?" +
        new URLSearchParams(
          Object.entries(filters).map(([key, value]) => [key, String(value)]),
        ),
      { method: "GET" },
    ),
  detail: (id: string) =>
    apiRequest<{ seller: SellerAccount }>("/admin/sellers/" + id, {
      method: "GET",
    }),
  requestReset: (id: string) =>
    apiRequest<{ message: string }>(
      "/admin/sellers/" + id + "/password-reset",
      { body: {} },
    ),
  create: (input: SellerInvitationInput) =>
    apiRequest<{
      sellerId: string;
      created: boolean;
      emailDelivery:
        | "accepted"
        | "failed"
        | "not_configured"
        | "previous_request";
      onboardingRequired: true;
    }>("/admin/sellers", { body: input, timeoutMs: 30000 }),
};
