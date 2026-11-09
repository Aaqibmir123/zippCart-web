import { apiRequest } from "../../../lib/api/client";
import { OrderItem } from "../../../lib/contracts/order";

export type AdminReturn = {
  id: string;
  createdAt: string;
  returnRequestId: string;
  status:
    | "return_requested"
    | "return_approved"
    | "return_rejected"
    | "return_completed";
  shipments: {
    status: string;
    dispatchedAt: string | null;
    storeName: string | null;
  }[];
  receivedAt: string | null;
  items: (OrderItem & { storeName: string | null })[];
  customer: string;
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    locality?: string;
    district?: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
  };
  total: number;
  paymentMethod: "cod" | "razorpay";
  paymentStatus: "unpaid" | "paid";
  returnRequestedAt: string;
  returnPreference: "refund" | "exchange" | null;
  returnReason: string | null;
  returnDescription: string | null;
  returnReviewNote: string | null;
  returnReviewedAt: string | null;
  returnCompletedAt: string | null;
  returnReference: string | null;
};
export type ReturnFilter = "open" | "closed" | "all";

export const adminReturnApi = {
  list: (status: ReturnFilter, page: number) =>
    apiRequest<{
      returns: AdminReturn[];
      total: number;
      nextPage: number | null;
    }>(`/admin/returns?status=${status}&page=${page}`, { method: "GET" }),
  detail: (id: string) =>
    apiRequest<{ order: AdminReturn }>(`/admin/returns/${id}`, {
      method: "GET",
    }),
};
