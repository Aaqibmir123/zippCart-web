"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  UserPlus,
  UsersRound,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { sellersApi } from "./sellers-api";
import { accountLabels, onboardingLabels, SellerStatus } from "./seller-status";
import { useAuth } from "../../auth/auth-provider";
import { useUrlState } from "../../../lib/hooks/use-url-state";
import {
  Button,
  Card,
  Field,
  Heading,
  Pagination,
  QueryState,
  Select,
} from "../../../components/ui";

export function SellersScreen() {
  const { user } = useAuth();
  const url = useUrlState();
  const q = url.get("q");
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  const account = Object.hasOwn(accountLabels, url.get("account"))
    ? url.get("account")
    : "all";
  const onboarding = Object.hasOwn(onboardingLabels, url.get("onboarding"))
    ? url.get("onboarding")
    : "all";
  const page = Math.min(1000, Math.max(1, Number(url.get("page", "1")) || 1));
  const query = useQuery({
    queryKey: ["admin-sellers", user?.id, q, account, onboarding, page],
    queryFn: () => sellersApi.list({ q, account, onboarding, page }),
    staleTime: 0,
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    url.set({ q: search.trim(), page: null });
  }
  return (
    <>
      <Heading
        title="Sellers"
        description="Seller accounts from invitation through onboarding. Store approval is tracked separately."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              <RefreshCw size={16} />
              Refresh sellers
            </Button>
            <Link
              prefetch={false}
              href="/admin/sellers/new"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-800"
            >
              <UserPlus size={18} />
              Create Seller
            </Link>
          </div>
        }
      />
      <Card className="mb-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-xl bg-purple-100 p-3 text-purple-700">
            <UsersRound size={22} />
          </span>
          <div>
            <p className="text-2xl font-bold">{query.data?.total ?? "—"}</p>
            <p className="text-sm text-slate-500">Matching seller accounts</p>
          </div>
        </div>
        <div className="grid items-end gap-4 lg:grid-cols-[2fr_1fr_1fr]">
          <form onSubmit={submit} className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Field
                label="Search sellers"
                placeholder="Phone, email, store or profile name"
                maxLength={80}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button type="submit" aria-label="Apply seller search">
              <Search size={18} />
            </Button>
          </form>
          <Select
            label="Account status"
            value={account}
            onChange={(value) => url.set({ account: value, page: null })}
            options={[
              { value: "all", label: "All accounts" },
              ...Object.entries(accountLabels).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <Select
            label="Onboarding status"
            value={onboarding}
            onChange={(value) => url.set({ onboarding: value, page: null })}
            options={[
              { value: "all", label: "All onboarding stages" },
              ...Object.entries(onboardingLabels).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
        </div>
      </Card>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
        empty={query.isSuccess && !query.data.sellers.length}
      />
      {!!query.data?.sellers.length && (
        <div className="overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm">
          <div
            className="hidden grid-cols-[1.5fr_1.5fr_1.4fr_1fr_auto] gap-5 border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid"
            aria-hidden="true"
          >
            <span>Seller & contact</span>
            <span>Business</span>
            <span>Account & onboarding</span>
            <span>Created</span>
            <span>Details</span>
          </div>
          <ul
            className="divide-y divide-slate-100"
            aria-label="Seller accounts"
          >
            {query.data.sellers.map((seller) => (
              <li
                key={seller.id}
                className="grid gap-5 p-5 hover:bg-purple-50/30 sm:p-6 xl:grid-cols-[1.5fr_1.5fr_1.4fr_1fr_auto]"
              >
                <div className="min-w-0">
                  <h2 className="font-bold text-slate-900">
                    {seller.name || "Seller"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{seller.phone}</p>
                  <p className="mt-1 break-all text-sm text-slate-500">
                    {seller.email || "No email saved"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {seller.recoveryVerified
                      ? "Recovery email verified"
                      : "Recovery email not verified"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">
                    {seller.storeName || "Store not supplied"}
                  </p>
                  <p className="mt-1 text-xs font-medium text-purple-700">
                    {seller.category || "No category"}
                  </p>
                  <p className="mt-2 break-words text-sm leading-6 text-slate-500">
                    {seller.address || "Address not supplied"}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2 xl:flex-col">
                  <SellerStatus status={seller.accountStatus}>
                    {accountLabels[seller.accountStatus]}
                  </SellerStatus>
                  <SellerStatus status={seller.onboardingStatus}>
                    {onboardingLabels[seller.onboardingStatus]}
                  </SellerStatus>
                  {seller.onboardingStatus === "approved" &&
                    !seller.storeActive && (
                      <span className="text-xs text-rose-700">
                        Store disabled
                      </span>
                    )}
                </div>
                <p className="text-sm text-slate-500">
                  {new Date(seller.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <Link
                  prefetch={false}
                  href={"/admin/sellers/" + seller.id}
                  aria-label={"View " + (seller.name || "Seller")}
                  className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-purple-800"
                >
                  View Details
                  <ArrowUpRight size={16} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Pagination
        page={page}
        busy={query.isFetching}
        hasMore={query.data?.hasMore ?? false}
        onPage={(value) => url.set({ page: value })}
      />
    </>
  );
}
