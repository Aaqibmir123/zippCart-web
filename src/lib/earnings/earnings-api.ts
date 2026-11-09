import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../api/client";
import { useAuth } from "../../features/auth/auth-provider";
import { useScreenActive } from "../hooks/use-page-active";
import { HoldGroups, Settlement, SettlementFilter } from "./settlement-model";
export type Totals = {
  grossPaise: number;
  refundPaise: number;
  commissionPaise: number;
  netPaise: number;
  eligiblePaise: number;
  orders: number;
  clearedCommissionPaise: number;
  pendingCommissionPaise: number;
};
export type StoreEarning = {
  storeId: string;
  name: string;
  payoutMethod: "upi" | "bank" | null;
  period: Totals;
  lifetime: Totals;
  paidPaise: number;
  periodPaidPaise: number;
  balancePaise: number;
  availablePaise: number;
  heldPaise: number;
};
export type EarningOrder = Settlement & {
  orderId: string;
  storeId: string;
  receivedAt: string | null;
  createdAt: string | null;
  grossPaise: number;
  refundPaise: number;
  commissionPaise: number;
  items: { name: string; quantity: number; amountPaise: number }[];
  commissionBps: number;
  netPaise: number;
  eligiblePaise: number;
  paymentVerified: boolean;
  holdReason: string | null;
};
export type Payout = {
  id: string;
  storeId: string;
  amountPaise: number;
  reference: string;
  method: string;
  createdAt: string;
  settledThrough: string;
};
export type Statement = {
  commissionBps: number;
  period: string;
  from: string;
  to: string;
  updatedAt: string;
  totals: Totals;
  stores: StoreEarning[];
  collectedPaise: number;
  uncollectedPaise: number;
  paidPaise: number;
  periodPaidPaise: number;
  payablePaise: number;
  nextReleaseAt: string | null;
  holds: HoldGroups;
  periodStates: HoldGroups;
  orders: EarningOrder[];
  payouts: Payout[];
  orderCount: number;
  payoutCount: number;
  page: number;
  nextPage: number | null;
};
export const localDate = () =>
  new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
export function useEarnings(
  admin: boolean,
  period = "month",
  date = localDate(),
  storeId = "",
  page = 1,
  state: SettlementFilter = "all",
) {
  const { user } = useAuth();
  const active = useScreenActive();
  return useQuery({
    queryKey: ["earnings", user?.id, admin, period, date, storeId, page, state],
    queryFn: () =>
      apiRequest<Statement>(
        `/${admin ? "admin" : "seller"}/earnings?period=${period}&date=${date}&page=${page}&state=${state}${admin && storeId ? `&storeId=${storeId}` : ""}`,
        { method: "GET" },
      ),
    enabled: active && !!user?.roles?.includes(admin ? "admin" : "seller"),
    staleTime: 30000,
    refetchInterval: active ? 30000 : false,
  });
}
export type PayoutAccount =
  | {
      method: "bank";
      accountHolder: string;
      accountNumber: string;
      ifsc: string;
    }
  | { method: "upi"; upiId: string };
export function usePayoutAccount(admin: boolean, storeId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payout-account", user?.id, admin, storeId],
    queryFn: () =>
      apiRequest<{ account: PayoutAccount | null }>(
        admin
          ? `/admin/earnings/stores/${storeId}/account`
          : "/seller/earnings/account",
        { method: "GET" },
      ),
    enabled:
      !!user?.roles?.includes(admin ? "admin" : "seller") &&
      (!admin || !!storeId),
    staleTime: 0,
    gcTime: 0,
  });
}
