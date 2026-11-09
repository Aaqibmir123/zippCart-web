import { apiRequest } from "../../../lib/api/client";
import { RtoAdminAction, RtoRecord, rtoApi } from "../../../lib/api/rto-api";

export type ReadyOrder =
  import("../../../lib/contracts/fulfillment").FulfillmentProgress & {
    reviewerOrder?: boolean;
    rto?: RtoRecord | null;
    publicReference: string;
    refundStatus?: string | null;
    returnRequestedAt?: string | null;
    returnRequestId?: string | null;
    returnPreference?: string | null;
    returnReason?: string | null;
    returnDescription?: string | null;
    returnReviewNote?: string | null;
    returnReviewedAt?: string | null;
    returnCompletedAt?: string | null;
    returnReference?: string | null;
    returnCases?: {
      id: string;
      status: string;
      preference: string;
      reason?: string;
      amount?: number;
      refundMethod?: string;
      reference?: string;
      createdAt?: string;
      updatedAt?: string;
      history: {
        action?: string;
        actor?: string;
        at?: string;
        status?: string;
      }[];
    }[];
    cancellation?:
      | import("../../../lib/contracts/order").OrderCancellation
      | null;
    operations: import("../../../lib/contracts/operations").Operations;
    settlements: (import("../../../lib/earnings/settlement-model").Settlement & {
      storeId: string;
    })[];
    receivedAt: string | null;
    id: string;
    status: string;
    createdAt: string;
    itemCount: number;
    total: number;
    paymentMethod: string;
    label: ShippingLabel | null;
    customerName?: string;
    storeNames?: string[];
  };
export type ShippingItem = {
  index?: number;
  name: string;
  color?: string;
  size?: string;
  quantity: number;
  price: number;
  productId: string;
};
export type ShippingAddress = {
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
export type AdminOrderDetail = ReadyOrder & {
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  subtotal: number;
  delivery: number;
  paymentStatus: string;
  location?: import("../../../lib/contracts/location").OrderLocation;
  expectedDispatchDate?: string;
  deliveryEta?: string;
  dispatchDelayReason?: string;
  sellers: {
    operations: import("../../../lib/contracts/operations").Operations;
    storeId: string;
    storeName: string;
    ownerName: string | null;
    phone: string | null;
    address: string | null;
    status: string;
    stockIssueOpen?: boolean;
    items: ShippingItem[];
  }[];
};
export type ShippingLabel = {
  reference: string;
  generatedAt: string;
  orderId: string;
  orderDate: string;
  customer: { name: string; phone: string; address: string };
  itemCount: number;
  packages: number;
  payment: string;
  collectAmount: number;
  qrValue: string;
  items?: Pick<ShippingItem, "name" | "color" | "size" | "quantity">[];
};

export type AdminOrdersPage = {
  orders: ReadyOrder[];
  total?: number;
  nextPage: number | null;
  ambiguous?: boolean;
  customer?: { name: string; phoneMasked: string } | null;
};

export const adminShippingApi = {
  rto: rtoApi.adminList,
  rtoAction: (id: string, action: RtoAdminAction) =>
    rtoApi.adminAction(id, action),
  all: (
    page = 1,
    queue: import("../overview/analytics-api").OrderQueue = "all",
    dates: { from?: string; to?: string; signal?: AbortSignal } = {},
  ) => {
    const params = new URLSearchParams({ page: String(page), queue });
    if (dates.from) params.set("from", dates.from);
    if (dates.to) params.set("to", dates.to);
    return apiRequest<AdminOrdersPage>(`/admin/shipping/orders?${params}`, {
      method: "GET",
      signal: dates.signal,
    });
  },
  search: (input: {
    mode: "reference" | "phone";
    query: string;
    page: number;
    queue: string;
    from?: string;
    to?: string;
    signal?: AbortSignal;
  }) => {
    const params = new URLSearchParams({
      mode: input.mode,
      query: input.query,
      page: String(input.page),
      queue: input.queue,
    });
    if (input.from) params.set("from", input.from);
    if (input.to) params.set("to", input.to);
    return apiRequest<AdminOrdersPage>(
      `/admin/shipping/orders/search?${params}`,
      { method: "GET", signal: input.signal },
    );
  },
  detail: (id: string) =>
    apiRequest<{ order: AdminOrderDetail }>(`/admin/shipping/${id}`, {
      method: "GET",
    }),
  transit: (page = 1) =>
    apiRequest<{ orders: ReadyOrder[]; nextPage: number | null }>(
      `/admin/shipping/in-transit?page=${page}`,
      { method: "GET" },
    ),
  attention: (page = 1) =>
    apiRequest<{ orders: AttentionOrder[]; nextPage: number | null }>(
      `/admin/shipping/attention?page=${page}`,
      { method: "GET" },
    ),
  resolve: (id: string, storeId: string, note: string) =>
    apiRequest(`/admin/shipping/${id}/resolve-issue`, {
      body: { storeId, note },
    }),
  settings: () =>
    apiRequest<{ settings: DispatchSettings }>("/admin/settings/dispatch", {
      method: "GET",
    }),
  updateSettings: (settings: DispatchSettings) =>
    apiRequest("/admin/settings/dispatch", { method: "PATCH", body: settings }),
  ready: (page = 1) =>
    apiRequest<{
      orders: ReadyOrder[];
      total: number;
      nextPage: number | null;
    }>(`/admin/shipping/ready?page=${page}`, { method: "GET" }),
  generateLabel: (id: string) =>
    apiRequest<{ label: ShippingLabel }>(`/admin/shipping/${id}/label`, {
      method: "POST",
    }),
  getLabel: (id: string) =>
    apiRequest<{ label: ShippingLabel }>(`/admin/shipping/${id}/label`, {
      method: "GET",
    }),
  dispatch: (id: string) =>
    apiRequest<{ order: ReadyOrder }>(`/admin/shipping/${id}/dispatch`, {
      method: "POST",
    }),
};
export type AttentionOrder = ReadyOrder & {
  reasons: string[];
  issues: { storeId: string; note: string }[];
};
export type DispatchSettings = {
  cutoffMinutes: number;
  weeklyOffDays: number[];
  holidays: string[];
  sameDayEnabled: boolean;
  defaultEtaDays: number;
  lowStockThreshold: number;
};
