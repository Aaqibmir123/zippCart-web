import { apiRequest } from "../../../lib/api/client";
import type {
  AdminAction,
  RefundPayout,
  ReturnCase,
  ReturnSummary,
} from "../../../lib/contracts/returns";
export const supportApi = {
  list: (status: string, page: number) =>
    apiRequest<{
      cases: ReturnSummary[];
      nextPage: number | null;
      total: number;
    }>(`/returns/admin?status=${status}&page=${page}`, { method: "GET" }),
  cases: (orderId: string) =>
    apiRequest<{ cases: ReturnCase[] }>(`/returns/admin/orders/${orderId}`, {
      method: "GET",
    }),
  read: (record: ReturnCase) =>
    apiRequest(`/returns/admin/orders/${record.orderId}/${record.id}/read`, {
      body: { version: record.version },
    }),
  action: (record: ReturnCase, body: AdminAction) =>
    apiRequest<{ case: ReturnCase }>(
      `/returns/admin/orders/${record.orderId}/${record.id}/actions`,
      { body },
    ),
  payout: (record: ReturnCase) =>
    apiRequest<{ payout: RefundPayout | null }>(
      `/returns/orders/${record.orderId}/${record.id}/payout`,
      { method: "GET" },
    ),
  upload: (orderId: string, data: string) =>
    apiRequest<{ id: string }>(`/returns/orders/${orderId}/photos`, {
      body: { data },
      timeoutMs: 30000,
    }),
  uploadBinary: (orderId: string, imageBody: Blob) =>
    apiRequest<{ id: string }>(`/returns/orders/${orderId}/photos/binary`, {
      imageBody,
      timeoutMs: 35000,
    }),
  photo: (orderId: string, id: string) =>
    apiRequest<{ data: string }>(`/returns/orders/${orderId}/photos/${id}`, {
      method: "GET",
    }),
};
