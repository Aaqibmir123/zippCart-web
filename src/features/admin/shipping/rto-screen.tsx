"use client";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { adminShippingApi } from "./shipping-api";
import { useScreenActive } from "../../../lib/hooks/use-page-active";
import {
  Badge,
  Button,
  Card,
  Heading,
  Notice,
  QueryState,
} from "../../../components/ui";
export function RtoScreen() {
  const { user } = useAuth();
  const active = useScreenActive();
  const query = useInfiniteQuery({
    queryKey: ["admin-rto", user?.id],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => adminShippingApi.rto(pageParam),
    getNextPageParam: (last) => last.nextPage ?? undefined,
    enabled: active && !user?.reviewer,
    retry: false,
    refetchInterval: active ? 30000 : false,
  });
  const orders = query.data?.pages.flatMap((page) => page.orders) ?? [];
  return (
    <>
      <Heading
        title="Return-to-origin recovery"
        description="Whole-order recovery for dispatched, undelivered parcels."
      />
      {user?.reviewer ? (
        <Notice>Recovery is unavailable in reviewer sessions.</Notice>
      ) : (
        <>
          <QueryState
            pending={query.isPending}
            error={query.error}
            retry={() => void query.refetch()}
            empty={query.isSuccess && !orders.length}
          />
          <div className="grid gap-5 lg:grid-cols-2">
            {orders.map((order) => (
              <Card key={order.id}>
                <h2 className="mb-3 font-bold">#{order.publicReference}</h2>
                <Badge>{order.rto.status.replaceAll("_", " ")}</Badge>
                <p className="mt-3 text-sm">{order.rto.reason}</p>
                <p className="mt-2 text-xs">
                  {order.paymentMethod.toUpperCase()} · {order.paymentStatus} ·{" "}
                  {new Date(order.rto.updatedAt).toLocaleString("en-IN")}
                </p>
                <Link
                  prefetch={false}
                  href={`/admin/shipping/${order.id}`}
                  className="mt-5 inline-block font-semibold text-purple-800"
                >
                  Review recovery →
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
              Load more recovery cases
            </Button>
          )}
        </>
      )}
    </>
  );
}
