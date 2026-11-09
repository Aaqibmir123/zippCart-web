import { apiRequest } from "./client";

export type RtoStatus =
  | "requested"
  | "under_review"
  | "recovery_pending"
  | "returning"
  | "admin_received"
  | "inspection_disputed"
  | "seller_receipt_pending"
  | "inspection"
  | "refund_pending"
  | "completed"
  | "rejected"
  | "recovery_failed";
export type RtoCounts = { index: number; quantity: number };
export type RtoSeller = {
  storeId: string;
  status: "pending" | "transferred" | "received" | "inspected";
  transferredAt?: string;
  receivedAt?: string;
  inspectedAt?: string;
  restockedAt?: string;
  receivedItems: RtoCounts[];
  missingItems?: RtoCounts[];
  damagedItems?: RtoCounts[];
  sellableItems: RtoCounts[];
};
export type RtoRecord = {
  id: string;
  orderId: string;
  status: RtoStatus;
  reason: string;
  requestedAt: string;
  updatedAt: string;
  expectedRecipient: "admin" | "seller" | null;
  currentCustodian: "admin" | "seller" | "split" | "unknown";
  adminReceivedAt?: string;
  adminReceivedItems?: RtoCounts[];
  adminReceivedMissingItems?: RtoCounts[];
  adminReceivedDamagedItems?: RtoCounts[];
  expectedStoreId?: string | null;
  disputedStoreId?: string | null;
  refund: {
    status: "not_required" | "pending" | "processing" | "processed" | "failed";
    amountPaise?: number;
    reference?: string;
  };
  sellers?: RtoSeller[];
  history: {
    action: string;
    status: RtoStatus;
    actorRole: "customer" | "admin" | "seller" | "system";
    at: string;
    note?: string;
    storeId?: string;
    items?: RtoCounts[];
    missingItems?: RtoCounts[];
    damagedItems?: RtoCounts[];
    photoIds?: string[];
  }[];
};
export type RtoAdminOrder = {
  id: string;
  publicReference: string;
  status: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  rto: RtoRecord;
};
export type RtoAdminAction =
  | { action: "begin_review" }
  | { action: "approve"; note?: string }
  | { action: "start_return"; recipient: "admin" | "seller"; note?: string }
  | { action: "reject" | "fail_recovery"; note: string }
  | {
      action: "receive_admin" | "reconcile_admin_receipt";
      items: RtoCounts[];
      damagedItems: RtoCounts[];
      note: string;
      photoIds?: string[];
    }
  | { action: "transfer_to_seller"; storeId: string }
  | { action: "complete_cod"; confirmation: true }
  | { action: "authorize_refund" | "retry_refund"; confirmation: true };

export const rtoApi = {
  request: (orderId: string, body: { clientKey: string; reason: string }) =>
    apiRequest<{ rto: RtoRecord }>(`/rto/orders/${orderId}`, { body }),
  adminList: (page = 1) =>
    apiRequest<{
      orders: RtoAdminOrder[];
      total: number;
      nextPage: number | null;
    }>(`/rto/admin?page=${page}`, { method: "GET" }),
  adminAction: (orderId: string, body: RtoAdminAction) =>
    apiRequest<{ rto: RtoRecord }>(`/rto/admin/orders/${orderId}/actions`, {
      body,
    }),
  sellerReceipt: (orderId: string, items: RtoCounts[]) =>
    apiRequest<{ rto: RtoRecord }>(`/rto/seller/orders/${orderId}/receipt`, {
      body: { items },
    }),
  sellerInspection: (orderId: string, items: RtoCounts[]) =>
    apiRequest<{ rto: RtoRecord }>(`/rto/seller/orders/${orderId}/inspection`, {
      body: { items },
    }),
};
