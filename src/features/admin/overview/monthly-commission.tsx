"use client";
import Link from "next/link";
import { useEarnings } from "../../../lib/earnings/earnings-api";
import { cash } from "../../../lib/earnings/payout-format";
export function MonthlyCommission() {
  const query = useEarnings(true);
  return (
    <Link
      prefetch={false}
      aria-busy={query.isPending}
      href="/admin/earnings"
      className="mb-6 block rounded-2xl bg-gradient-to-r from-purple-800 to-pink-700 p-6 text-white"
    >
      <p className="text-sm text-purple-100">Cleared commission this month</p>
      <p className="mt-3 text-3xl font-bold">
        {query.data ? cash(query.data.totals.clearedCommissionPaise) : "—"}
      </p>
      <p className="mt-3 text-sm">
        {query.isError
          ? "Could not load. Open payouts to retry."
          : "View payouts →"}
      </p>
    </Link>
  );
}
