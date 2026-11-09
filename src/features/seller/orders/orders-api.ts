import { apiRequest } from "../../../lib/api/client";
import { OrderItem } from "../../../lib/contracts/order";
import { ReturnStatus } from "../../../lib/contracts/returns";
import { Operations, OperationsQueue } from "../../../lib/contracts/operations";
import { Settlement } from "../../../lib/earnings/settlement-model";
import { RtoRecord } from "../../../lib/api/rto-api";

export type SellerOrder = {
  reviewerOrder?: boolean;
  rto?: RtoRecord | null;
  cancellation?:
    | import("../../../lib/contracts/order").OrderCancellation
    | null;
  operations: Operations;
  settlement: Settlement | null;
  stockIssue?: { open: boolean; note: string; reportedAt: string };
  viewedAt?: string | null;
  expectedDispatchDate?: string | null;
  id: string;
  items: (OrderItem & { itemIndex?: number })[];
  status:
    | "cancelled"
    | "placed"
    | "preparing"
    | "packed"
    | "ready_for_dispatch"
    | "dispatched"
    | "out_for_delivery"
    | "delivered"
    | "return_requested"
    | "return_approved"
    | "return_rejected"
    | "return_completed";
  dispatchedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  fulfillmentTimeline?: import("../../../lib/contracts/fulfillment").FulfillmentStep[];
  returnRequestedAt: string | null;
  returnPreference: "refund" | "exchange" | null;
  returnRequestId: string | null;
  returnReason: string | null;
  returnDescription: string | null;
  returnReviewedAt: string | null;
  returnCompletedAt: string | null;
  returnCases?: {
    id: string;
    status: ReturnStatus;
    preference: "refund" | "exchange";
    reason: string;
    items: {
      name: string;
      quantity: number;
      color?: string;
      size?: string;
      exchangeColor?: string;
      exchangeSize?: string;
      restockedQuantity?: number;
    }[];
    inventory?: {
      replacement?: "reserved" | "released" | "dispatched";
      inspectedAt?: string;
    };
  }[];
  customer: string;
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    locality: string;
    district?: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
  };
  paymentMethod: "cod" | "razorpay" | "review_redacted";
  paymentStatus: "unpaid" | "paid" | "cancelled" | "review_redacted";
  subtotal: number;
  reviewerRedacted?: boolean;
};
export type SellerOrderSummary = {
  totalOrders: number;
  orderValue: number;
  pending: number;
  dispatched: number;
  delivered: number;
  returnRequests: number;
};
export const sellerOrderApi = {
  viewed: (id: string) => apiRequest(`/seller/orders/${id}/viewed`, {}),
  reportStockIssue: (id: string, note: string) =>
    apiRequest<{ order: SellerOrder }>(`/seller/orders/${id}/stock-issue`, {
      body: { note },
    }),
  list: (page: number, queue: OperationsQueue = "all") =>
    apiRequest<{
      orders: SellerOrder[];
      summary: SellerOrderSummary;
      queues: Record<OperationsQueue, number>;
      total: number;
      nextPage: number | null;
    }>(`/seller/orders?page=${page}&queue=${queue}`, { method: "GET" }),
  dispatch: (id: string) =>
    apiRequest<{ order: SellerOrder }>(`/seller/orders/${id}/dispatch`, {}),
  readyForDispatch: (id: string) =>
    apiRequest<{ order: SellerOrder }>(`/seller/orders/${id}/ready`, {}),
  setPreparationStatus: (id: string, status: "preparing" | "packed") =>
    apiRequest<{ order: SellerOrder }>(`/seller/orders/${id}/preparation`, {
      method: "PATCH",
      body: { status },
    }),
};
