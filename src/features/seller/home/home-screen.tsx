"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { useSellerSession } from "../session/seller-access";
import { sellerOrderApi } from "../orders/orders-api";
import { useSellerProducts } from "../products/use-products";
import { storeApi } from "../store/store-api";
import {
  groupOptions,
  operationsOptions,
} from "../../../lib/contracts/operations";
import { SellerPayoutOverview } from "../earnings/payout-overview";
import { money } from "../../../lib/format";
import { StockAlerts } from "../../../components/stock-alerts";
import {
  Button,
  Card,
  Heading,
  Notice,
  QueryState,
} from "../../../components/ui";
export function SellerHomeScreen() {
  const { user } = useAuth();
  const session = useSellerSession();
  const client = useQueryClient();
  const orders = useInfiniteQuery({
    queryKey: ["seller-orders", user?.id, "all"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => sellerOrderApi.list(pageParam),
    getNextPageParam: (last) => last.nextPage ?? undefined,
    refetchInterval: 30000,
  });
  const products = useSellerProducts(user?.id);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const store = session.data?.store;
  return (
    <>
      <Heading
        title={store?.storeName ?? "Your store"}
        description="Your daily orders, stock and earnings."
      />
      {store && (
        <Card className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-bold">
                {store.isOpen ? "Store is open" : "Store is closed"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {store.isOpen
                  ? "Accepting new orders"
                  : "New orders are paused"}
              </p>
            </div>
            <Button
              role="switch"
              aria-label="Store availability"
              aria-checked={store.isOpen}
              disabled={busy}
              onClick={async () => {
                if (lock.current) return;
                lock.current = true;
                setBusy(true);
                setError("");
                try {
                  const result = await storeApi.setAvailability(!store.isOpen);
                  client.setQueryData(["seller-session", user?.id], result);
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Could not update availability.",
                  );
                } finally {
                  lock.current = false;
                  setBusy(false);
                }
              }}
            >
              {busy
                ? "Updating…"
                : store.isOpen
                  ? "Pause new orders"
                  : "Open store"}
            </Button>
          </div>
          {error && <Notice error>{error}</Notice>}
        </Card>
      )}
      <QueryState
        pending={orders.isPending}
        error={orders.error}
        retry={() => void orders.refetch()}
      />
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...groupOptions, ...operationsOptions].map((option) => (
            <Link
              key={option.key}
              href={`/seller/orders?queue=${option.key}`}
              prefetch={false}
            >
              <Card>
                <p className="text-sm text-slate-600">{option.label}</p>
                <p className="mt-3 text-3xl font-bold">
                  {orders.data?.pages[0]?.queues[option.key] ?? 0}
                </p>
              </Card>
            </Link>
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Link prefetch={false} href="/seller/products">
            <Card>
              <p className="text-sm text-slate-500">Catalogue</p>
              <p className="mt-3 text-3xl font-bold">
                {products.data?.pages[0]?.total ?? 0} products
              </p>
              {products.isError && (
                <p className="mt-2 text-sm text-rose-800">
                  Could not refresh catalogue count
                </p>
              )}
            </Card>
          </Link>
        </div>
        <StockAlerts />
        <SellerPayoutOverview />
        <Card>
          <h2 className="mb-4 text-lg font-bold">Recent orders</h2>
          {orders.data?.pages[0]?.orders.slice(0, 3).map((order) => (
            <Link
              prefetch={false}
              key={order.id}
              href={`/seller/orders/${order.id}`}
              className="block border-t border-slate-100 py-4"
            >
              <p className="font-semibold">
                #{order.id.slice(-8).toUpperCase()} · {order.customer}
              </p>
              <p className="mt-2 text-sm">
                {order.items
                  .map((item) => `${item.quantity} × ${item.name}`)
                  .join(", ")}
              </p>
              <p className="mt-2 text-sm">
                {order.reviewerRedacted
                  ? "Amount hidden"
                  : money(order.subtotal)}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {new Date(order.createdAt).toLocaleString("en-IN")} ·{" "}
                {order.status.replaceAll("_", " ")}
              </p>
            </Link>
          ))}
          <Link
            prefetch={false}
            href="/seller/orders"
            className="mt-4 inline-block font-semibold text-purple-800"
          >
            All orders →
          </Link>
        </Card>
      </div>
    </>
  );
}
