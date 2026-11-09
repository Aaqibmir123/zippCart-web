import { apiRequest } from "../../../lib/api/client";
import { StoreSummary } from "../../../lib/contracts/store";

export type RequestFilter = "pending" | "approved" | "rejected" | "all";
export type DocumentName =
  | "storeFrontPhoto"
  | "aadhaarCard"
  | "panCard"
  | "shopLicense";
export type RequestDetail = StoreSummary & {
  ownerFullName: string;
  mobileNumber: string;
  fullAddress: string;
  payout:
    | { method: "upi"; upiId: string }
    | {
        method: "bank";
        accountHolder: string;
        accountNumber: string;
        ifsc: string;
      };
  termsVersion: string;
  termsAcceptedAt: string;
  reviewedAt: string | null;
  reviewHistory?: { action: string; at: string; note?: string }[];
};
export const adminStoreApi = {
  list: (status: RequestFilter, cursor?: string) =>
    apiRequest<{ stores: StoreSummary[]; nextCursor: string | null }>(
      `/admin/stores?status=${status}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      { method: "GET" },
    ),
  counts: () =>
    apiRequest<{ counts: Record<RequestFilter, number> }>(
      "/admin/stores/counts",
      { method: "GET" },
    ),
  detail: (id: string) =>
    apiRequest<{ store: RequestDetail }>(`/admin/stores/${id}`, {
      method: "GET",
    }),
  document: (id: string, name: DocumentName) =>
    apiRequest<{ dataUrl: string }>(`/admin/stores/${id}/documents/${name}`, {
      method: "GET",
    }),
  review: (
    id: string,
    storeStatus: "approved" | "rejected",
    expectedStatus = "pending",
    expectedRevision = 0,
    note = "",
  ) =>
    apiRequest<{ store: StoreSummary }>(`/admin/stores/${id}/status`, {
      method: "PATCH",
      body: { storeStatus, expectedStatus, expectedRevision, note },
    }),
  setActive: (
    id: string,
    isActive: boolean,
    expectedRevision: number,
    note = "",
  ) =>
    apiRequest<{ store: StoreSummary }>(`/admin/stores/${id}/active`, {
      method: "PATCH",
      body: { isActive, expectedRevision, note },
    }),
};
