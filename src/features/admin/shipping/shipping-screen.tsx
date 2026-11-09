"use client";
import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import {
  adminShippingApi,
  type AdminOrdersPage,
  type AttentionOrder,
} from "./shipping-api";
import {
  queueOptions,
  useAdminAnalytics,
  type OrderQueue,
} from "../overview/analytics-api";
import { useUrlState } from "../../../lib/hooks/use-url-state";
import { useScreenActive } from "../../../lib/hooks/use-page-active";
import { money } from "../../../lib/format";
import { StockAlerts } from "../../../components/stock-alerts";
import { ResolveIssue } from "./resolve-issue";
import {
  Badge,
  Button,
  Card,
  Field,
  Heading,
  Notice,
  QueryState,
  Select,
} from "../../../components/ui";

export function ShippingScreen() {
  const { user } = useAuth();
  const url = useUrlState();
  const active = useScreenActive();
  const requestedTab = url.get("tab", "all");
  const tab = ["all", "transit", "attention", "stock"].includes(requestedTab)
    ? requestedTab
    : "all";
  const queue = url.get("queue", "all") as OrderQueue;
  const search = url.get("query");
  const mode = url.get("mode", "reference") as "phone" | "reference";
  const [draft, setDraft] = useState(search);
  const [error, setError] = useState("");
  const dateFilter = url.get("date", "all");
  const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const from = new Date(`${today}T00:00:00Z`);
  from.setUTCDate(
    from.getUTCDate() -
      (dateFilter === "today" ? 0 : dateFilter === "7d" ? 6 : 29),
  );
  const dates =
    dateFilter === "all"
      ? {}
      : { from: from.toISOString().slice(0, 10), to: today };
  const awaitingSearch =
    draft.trim().length > 0 && draft.trim().replace(/^#\s*/, "") !== search;
  const analytics = useAdminAnalytics(
    7,
    active && tab === "all" && !search && dateFilter === "all",
  );
  const counts =
    !search && dateFilter === "all" && !analytics.isError
      ? analytics.data?.queues
      : undefined;
  const query = useInfiniteQuery<AdminOrdersPage>({
    queryKey: ["admin-shipping-all", user?.id, tab, queue, dates, mode, search],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      tab === "transit"
        ? adminShippingApi.transit(Number(pageParam))
        : tab === "attention"
          ? adminShippingApi.attention(Number(pageParam))
          : search
            ? adminShippingApi.search({
                mode,
                query: search,
                page: Number(pageParam),
                queue,
                ...dates,
                signal,
              })
            : adminShippingApi.all(Number(pageParam), queue, {
                ...dates,
                signal,
              }),
    getNextPageParam: (last) => last.nextPage ?? undefined,
    enabled: active && tab !== "stock" && !awaitingSearch,
    retry: false,
    refetchInterval: active && !awaitingSearch ? 30000 : false,
  });
  const orders = awaitingSearch
    ? []
    : (query.data?.pages.flatMap((page) => page.orders) ?? []);
  function submit() {
    const value =
      mode === "reference" ? draft.trim().replace(/^#\s*/, "") : draft.trim();
    if (
      mode === "reference"
        ? !/^(?:[a-f\d]{8}|[a-f\d]{24})$/i.test(value)
        : !/^\d{10}$/.test(value)
    ) {
      setError(
        mode === "reference"
          ? "Enter the 8-character reference or full 24-character Order ID."
          : "Enter a valid 10-digit customer phone number.",
      );
      return;
    }
    if (mode === "phone" && user?.reviewer) {
      setError("Phone lookup is unavailable in reviewer access.");
      return;
    }
    setError("");
    setDraft(value);
    url.set({ query: value, queue: "all", date: "all", tab: "all" });
  }
  return (
    <>
      <Heading
        title="Orders & shipping"
        description="Find orders and coordinate fulfillment."
        actions={
          <Link
            prefetch={false}
            href="/admin/shipping/settings"
            className="rounded-xl border border-purple-200 px-4 py-3 text-sm font-semibold text-purple-800"
          >
            Dispatch settings
          </Link>
        }
      />
      <nav aria-label="Shipping views" className="mb-5 flex flex-wrap gap-3">
        {[
          ["all", "All orders"],
          ["transit", "In transit"],
          ["attention", "Attention"],
          ["stock", "Stock"],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={tab === value ? "primary" : "secondary"}
            onClick={() => {
              setDraft("");
              url.set({ tab: value, query: null });
            }}
          >
            {label}
          </Button>
        ))}
        {!user?.reviewer && (
          <Link
            prefetch={false}
            href="/admin/shipping/rto"
            className="rounded-xl border border-purple-200 px-4 py-3 text-sm font-semibold text-purple-800"
          >
            RTO
          </Link>
        )}
      </nav>
      {tab === "stock" ? (
        <StockAlerts admin />
      ) : (
        <>
          <Card className="mb-5">
            <div className="grid items-end gap-4 sm:grid-cols-3">
              <Select
                label="Search mode"
                value={mode}
                onChange={(value) => {
                  setDraft("");
                  url.set({ mode: value, query: null });
                }}
                options={[
                  { value: "reference", label: "Order ID" },
                  ...(!user?.reviewer
                    ? [{ value: "phone", label: "Customer phone" }]
                    : []),
                ]}
              />
              <form
                className="flex items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  submit();
                }}
              >
                <Field
                  label={
                    mode === "reference"
                      ? "Search by full or short Order ID"
                      : "Search customer by phone"
                  }
                  value={draft}
                  onChange={(event) => {
                    setDraft(
                      mode === "phone"
                        ? event.target.value.replace(/\D/g, "").slice(0, 10)
                        : event.target.value,
                    );
                    setError("");
                  }}
                />
                <Button type="submit">Search</Button>
              </form>
              <Button
                variant="secondary"
                onClick={() => {
                  setDraft("");
                  setError("");
                  url.set({ query: null });
                }}
              >
                Clear search
              </Button>
            </div>
            {error && <Notice error>{error}</Notice>}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Select
                label="Order queue"
                value={queue}
                onChange={(value) => url.set({ queue: value })}
                options={[
                  { value: "all", label: `All (${counts?.all ?? "—"})` },
                  {
                    value: "active",
                    label: `Active (${counts?.active ?? "—"})`,
                  },
                  {
                    value: "history",
                    label: `History (${counts?.history ?? "—"})`,
                  },
                  ...queueOptions.map((value) => ({
                    value: value.key,
                    label: `${value.label} (${counts?.[value.key] ?? "—"})`,
                  })),
                ]}
              />
              <Select
                label="Order date"
                value={dateFilter}
                onChange={(value) => url.set({ date: value })}
                options={[
                  { value: "all", label: "Any time" },
                  { value: "today", label: "Today" },
                  { value: "7d", label: "7 days" },
                  { value: "30d", label: "30 days" },
                ]}
              />
            </div>
          </Card>
          {tab === "all" &&
            !search &&
            dateFilter === "all" &&
            analytics.isError && (
              <Button
                variant="secondary"
                onClick={() => void analytics.refetch()}
              >
                Counts unavailable. Retry
              </Button>
            )}
          {["returns", "exchanges", "refund_pending", "refunded"].includes(
            queue,
          ) && (
            <Link
              prefetch={false}
              className="mb-5 inline-block font-semibold text-purple-800"
              href="/admin/support"
            >
              Manage requests in Support →
            </Link>
          )}
          {query.data && !awaitingSearch && (
            <p className="mb-4 text-sm text-slate-500">
              {query.data.pages[0]?.total ?? orders.length} orders
              {query.hasNextPage ? "+" : ""}
            </p>
          )}
          {!awaitingSearch && (
            <QueryState
              pending={query.isPending}
              error={query.error}
              retry={() => void query.refetch()}
              empty={!orders.length && query.isSuccess}
            />
          )}
          {query.data?.pages[0]?.ambiguous && (
            <Notice>
              More than one order matches this reference. Choose the correct
              full Order ID.
            </Notice>
          )}
          {query.data?.pages[0]?.customer && (
            <Notice>
              {query.data.pages[0].customer.name} ·{" "}
              {query.data.pages[0].customer.phoneMasked}
            </Notice>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            {orders.map((order) => (
              <Card key={order.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <h2 className="font-bold">
                    #{order.publicReference ?? order.id.slice(-8).toUpperCase()}
                  </h2>
                  <Badge>{order.operations.stage.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-3 text-sm">
                  {order.customerName} · {order.storeNames?.join(", ")}
                </p>
                <p className="mt-2 text-sm">
                  {new Date(order.createdAt).toLocaleString("en-IN")} ·{" "}
                  {order.itemCount} items · {money(order.total)}
                </p>
                <p className="mt-2 text-sm">
                  {order.paymentMethod.toUpperCase()} ·{" "}
                  {order.status.replaceAll("_", " ")}
                </p>
                {tab === "attention" && (
                  <>
                    <Notice error>
                      {(order as AttentionOrder).reasons?.join(" · ")}
                    </Notice>
                    {(order as AttentionOrder).issues?.map((issue) => (
                      <ResolveIssue
                        key={issue.storeId}
                        orderId={order.id}
                        issue={issue}
                      />
                    ))}
                  </>
                )}
                <Link
                  prefetch={false}
                  href={`/admin/shipping/${order.id}`}
                  className="mt-5 inline-block font-semibold text-purple-800"
                >
                  View order details →
                </Link>
              </Card>
            ))}
          </div>
          {query.hasNextPage && !awaitingSearch && (
            <Button
              className="mt-6"
              variant="secondary"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              Load more orders
            </Button>
          )}
        </>
      )}
    </>
  );
}
