"use client";
import Link from "next/link";
import { MonthlyCommission } from "./monthly-commission";
import { useAdminAnalytics, queueOptions } from "./analytics-api";
import { useUrlState } from "../../../lib/hooks/use-url-state";
import { money } from "../../../lib/format";
import {
  Badge,
  Button,
  Card,
  Heading,
  QueryState,
  Select,
} from "../../../components/ui";

export function OverviewScreen() {
  const url = useUrlState();
  const days = [1, 7, 30].includes(Number(url.get("days", "7")))
    ? Number(url.get("days", "7"))
    : 7;
  const query = useAdminAnalytics(days);
  const data = query.data;
  return (
    <>
      <Heading
        title="Business overview"
        description={
          data
            ? `Updated ${new Date(data.updatedAt).toLocaleString("en-IN")}`
            : "Your orders, stores and business activity."
        }
        actions={
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Refresh overview
          </Button>
        }
      />
      <MonthlyCommission />
      <div className="mb-6 max-w-xs">
        <Select
          label="Analytics period"
          value={String(days)}
          onChange={(value) => url.set({ days: value })}
          options={[
            { value: "1", label: "Today" },
            { value: "7", label: "7 days" },
            { value: "30", label: "30 days" },
          ]}
        />
      </div>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {data && (
        <div className="space-y-7">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Orders", data.totals.orders],
              ["Order value", money(data.totals.orderValue)],
              ["Paid value", money(data.totals.paidValue)],
              ["Delivered value", money(data.totals.deliveredValue)],
            ].map(([label, value]) => (
              <Card key={label}>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-bold">{value}</p>
              </Card>
            ))}
          </div>
          <Card>
            <h2 className="mb-4 text-xl font-bold">Order queues</h2>
            <p className="mb-5 text-sm text-slate-500">
              Current totals. Return queues can overlap.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[{ key: "all", label: "All orders" }, ...queueOptions].map(
                (queue) => (
                  <Link
                    key={queue.key}
                    href={`/admin/shipping?queue=${queue.key}`}
                    prefetch={false}
                    className="rounded-xl bg-purple-50 p-4 hover:bg-purple-100"
                  >
                    <p className="text-sm text-purple-900">{queue.label}</p>
                    <p className="mt-2 text-2xl font-bold">
                      {data.queues[queue.key as keyof typeof data.queues] ?? 0}
                    </p>
                  </Link>
                ),
              )}
            </div>
          </Card>
          <div className="grid gap-5 sm:grid-cols-3">
            <Link href="/admin/stores?status=pending" prefetch={false}>
              <Card>
                <p>Store requests</p>
                <p className="mt-3 text-3xl font-bold">{data.stores.pending}</p>
              </Card>
            </Link>
            <Link href="/admin/stores?status=approved" prefetch={false}>
              <Card>
                <p>Approved stores</p>
                <p className="mt-3 text-3xl font-bold">
                  {data.stores.approved}
                </p>
                <p className="mt-2 text-sm">{data.stores.open} open</p>
              </Card>
            </Link>
            <Card>
              <p>Refunds</p>
              <p className="mt-3 text-2xl font-bold">
                {money(data.refunds.amount)}
              </p>
              <p className="mt-2 text-sm">
                {data.refunds.count} requests · {data.refunds.legacyCount}{" "}
                earlier requests
              </p>
            </Card>
          </div>
          <Card>
            <h2 className="mb-4 text-xl font-bold">Daily business activity</h2>
            <div className="space-y-4">
              {data.daily.map((day) => (
                <div key={day.date}>
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <span>{day.date}</span>
                    <span>
                      {day.orders} orders · {money(day.value)}
                    </span>
                  </div>
                  <meter
                    aria-label={`${day.date}: ${day.orders} orders, ${money(day.value)}`}
                    min={0}
                    max={Math.max(1, ...data.daily.map((item) => item.value))}
                    value={day.value}
                    className="mt-2 h-3 w-full accent-purple-600"
                  />
                </div>
              ))}
            </div>
          </Card>
          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-xl font-bold">Top stores</h2>
              {data.topStores.map((store) => (
                <div key={store.id} className="border-b border-slate-100 py-4">
                  <Link
                    prefetch={false}
                    href={`/admin/stores/${store.id}`}
                    className="font-semibold text-purple-800"
                  >
                    {store.name}
                  </Link>
                  <p className="mt-2 text-sm">
                    {store.orders} orders · {store.units} units ·{" "}
                    {money(store.value)}
                  </p>
                  <p className="my-2 text-sm">
                    {store.deliveredOrders} delivered · Last order{" "}
                    {new Date(store.lastOrderAt).toLocaleString("en-IN")}
                  </p>
                  <Badge>
                    {store.isActive
                      ? store.isOpen
                        ? "Open"
                        : "Closed"
                      : "Disabled"}
                  </Badge>
                </div>
              ))}
            </Card>
            <Card>
              <h2 className="mb-4 text-xl font-bold">Top products</h2>
              {data.topProducts.map((product) => (
                <div
                  key={product.id}
                  className="border-b border-slate-100 py-4"
                >
                  <p className="font-semibold">{product.name}</p>
                  <p className="mt-2 text-sm">
                    {product.units} units · {money(product.value)}
                  </p>
                </div>
              ))}
            </Card>
          </div>
          <Link
            prefetch={false}
            className="inline-block rounded-xl bg-purple-700 px-5 py-3 font-semibold text-white"
            href="/admin/earnings"
          >
            Payouts & earnings
          </Link>
        </div>
      )}
    </>
  );
}
