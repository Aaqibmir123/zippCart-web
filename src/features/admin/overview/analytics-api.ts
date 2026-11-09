import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { apiRequest } from "../../../lib/api/client";
import { useScreenActive } from "../../../lib/hooks/use-page-active";

export const queueOptions = [
  { key: "new", label: "Confirmed", color: "#315FD3", bg: "#EAF0FF" },
  { key: "preparing", label: "Processing", color: "#AB690B", bg: "#FFF3D9" },
  { key: "dispatched", label: "Dispatched", color: "#7139F5", bg: "#F0E7FF" },
  { key: "delivered", label: "Delivered", color: "#187A53", bg: "#E3F6ED" },
  {
    key: "return_window",
    label: "24-hour window",
    color: "#8A5A0A",
    bg: "#FFF5E3",
  },
  { key: "returns", label: "Returns", color: "#AE3775", bg: "#FCE8F2" },
  { key: "exchanges", label: "Exchanges", color: "#087D91", bg: "#E0F5FA" },
  {
    key: "refund_pending",
    label: "Refund pending",
    color: "#A45419",
    bg: "#FFF0E4",
  },
  { key: "refunded", label: "Refunded", color: "#237C86", bg: "#E5F5F5" },
  { key: "cancelled", label: "Cancelled", color: "#AE414B", bg: "#FBEAED" },
] as const;
export type OrderQueue =
  | "all"
  | "active"
  | "history"
  | (typeof queueOptions)[number]["key"];
export type AdminAnalytics = {
  days: number;
  from: string;
  updatedAt: string;
  queues: Record<OrderQueue, number>;
  stores: { pending: number; approved: number; open: number };
  refunds: { count: number; amount: number; legacyCount: number };
  totals: {
    orders: number;
    orderValue: number;
    paidValue: number;
    deliveredOrders: number;
    deliveredValue: number;
  };
  daily: { date: string; orders: number; value: number }[];
  topStores: {
    id: string;
    name: string;
    orders: number;
    units: number;
    value: number;
    deliveredOrders: number;
    isOpen: boolean;
    isActive: boolean;
    lastOrderAt: string;
  }[];
  topProducts: { id: string; name: string; units: number; value: number }[];
};
export function useAdminAnalytics(days = 7, enabled = true) {
  const { user } = useAuth();
  const active = useScreenActive(enabled);
  return useQuery({
    queryKey: ["admin-analytics", user?.id, days],
    queryFn: ({ signal }) =>
      apiRequest<AdminAnalytics>(`/admin/analytics?days=${days}`, {
        method: "GET",
        timeoutMs: 20000,
        signal,
      }),
    enabled: active && !!user?.roles?.includes("admin"),
    refetchInterval: active ? 30000 : false,
  });
}
