"use client";
import Link from "next/link";
import { useAuth } from "../../auth/auth-provider";
import { useEarnings } from "../../../lib/earnings/earnings-api";
import {
  BalanceSummary,
  SettlementHolds,
} from "../../../components/earnings-balances";
import { Notice, QueryState } from "../../../components/ui";
export function SellerPayoutOverview() {
  const { user } = useAuth();
  const query = useEarnings(false);
  if (user?.reviewer && !user.reviewerFullAccess)
    return (
      <Notice>
        Payout amounts and financial records are hidden in reviewer mode.
      </Notice>
    );
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Your payout</h2>
        <Link
          prefetch={false}
          href="/seller/earnings"
          className="font-semibold text-purple-800"
        >
          View payout details →
        </Link>
      </div>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && (
        <>
          <BalanceSummary data={query.data} />
          <SettlementHolds data={query.data} pendingOnly />
        </>
      )}
    </section>
  );
}
