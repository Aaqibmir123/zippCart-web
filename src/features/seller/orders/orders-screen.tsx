"use client";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { sellerOrderApi } from "./orders-api";
import {
  operationsOptions,
  groupOptions,
  type OperationsQueue,
} from "../../../lib/contracts/operations";
import { statusLabels } from "../../../lib/contracts/returns";
import { useUrlState } from "../../../lib/hooks/use-url-state";
import { useScreenActive } from "../../../lib/hooks/use-page-active";
import { money } from "../../../lib/format";
import {
  Badge,
  Button,
  Card,
  Heading,
  QueryState,
  Select,
} from "../../../components/ui";
export function SellerOrdersScreen() {
  const { user } = useAuth();
  const url = useUrlState();
  const active = useScreenActive();
  const queue = url.get("queue", "all") as OperationsQueue;
  const query = useInfiniteQuery({
    queryKey: ["seller-orders", user?.id, queue],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => sellerOrderApi.list(pageParam, queue),
    getNextPageParam: (last) => last.nextPage ?? undefined,
    enabled: active,
    refetchInterval: active ? 30000 : false,
  });
  const orders = query.data?.pages.flatMap((page) => page.orders) ?? [];
  return (
    <>
      <Heading
        title="Customer orders"
        description="Orders containing your store’s products."
        actions={
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Refresh orders
          </Button>
        }
      />
      <div className="mb-5 max-w-md">
        <Select
          label="Order queue"
          value={queue}
          onChange={(value) => url.set({ queue: value })}
          options={[...groupOptions, ...operationsOptions].map((option) => ({
            value: option.key,
            label: `${option.label} (${query.data?.pages[0]?.queues[option.key] ?? "…"})`,
          }))}
        />
      </div>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
        empty={query.isSuccess && !orders.length}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {orders.map((order) => (
          <Card key={order.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <h2 className="font-bold">#{order.id.slice(-8).toUpperCase()}</h2>
              <Badge>{order.operations.stage}</Badge>
            </div>
            <div className="my-4 flex gap-3">
              {order.items[0]?.coverImage && (
                <img
                  src={order.items[0].coverImage}
                  alt=""
                  loading="lazy"
                  className="h-20 w-20 rounded-xl object-cover"
                />
              )}
              <div>
                <p className="font-semibold">{order.customer}</p>
                <p className="mt-2 text-sm">
                  {order.items
                    .map((item) => `${item.quantity} × ${item.name}`)
                    .join(", ")}
                </p>
              </div>
            </div>
            <p className="text-sm">
              {order.reviewerRedacted
                ? "Financial details hidden"
                : `${money(order.subtotal)} · ${order.paymentMethod.toUpperCase()}`}
            </p>
            <p className="mt-2 text-xs">
              {new Date(order.createdAt).toLocaleString("en-IN")} ·{" "}
              {order.status.replaceAll("_", " ")}
            </p>
            {order.returnCases?.map((record) => (
              <p key={record.id} className="mt-2 text-sm">
                {record.preference}: {statusLabels[record.status]}
              </p>
            ))}
            {order.returnRequestId && (
              <p className="mt-2 text-xs">Return ID: {order.returnRequestId}</p>
            )}
            <Link
              prefetch={false}
              href={`/seller/orders/${order.id}`}
              aria-label={`View order ${order.id.slice(-8)}`}
              className="mt-5 inline-block font-semibold text-purple-800"
            >
              View order →
            </Link>
          </Card>
        ))}
      </div>
      {query.hasNextPage && (
        <Button
          className="mt-5"
          variant="secondary"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Load more orders
        </Button>
      )}
    </>
  );
}
