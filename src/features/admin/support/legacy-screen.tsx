"use client";
import Link from "next/link";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { useUrlState } from "../../../lib/hooks/use-url-state";
import { adminReturnApi, type ReturnFilter } from "./legacy-api";
import { money } from "../../../lib/format";
import {
  Badge,
  Button,
  Card,
  Details,
  Heading,
  Notice,
  QueryState,
  Select,
} from "../../../components/ui";
export function LegacyScreen({ id }: { id?: string }) {
  const { user } = useAuth();
  const url = useUrlState();
  const filter = url.get("status", "open") as ReturnFilter;
  const query = useInfiniteQuery({
    queryKey: ["admin-returns", user?.id, filter],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => adminReturnApi.list(filter, pageParam),
    getNextPageParam: (last) => last.nextPage ?? undefined,
    enabled: !id,
  });
  const detail = useQuery({
    queryKey: ["admin-return", user?.id, id],
    queryFn: () => adminReturnApi.detail(id!),
    enabled: !!id,
    retry: false,
  });
  const order = detail.data?.order;
  return (
    <>
      <Link
        prefetch={false}
        href={id ? "/admin/support/earlier" : "/admin/support"}
        className="mb-5 inline-block text-purple-800"
      >
        ← {id ? "Earlier requests" : "Support"}
      </Link>
      <Heading
        title="Earlier requests"
        description="Read-only history. Open records require operations reconciliation; do not ask the customer to submit a duplicate request."
      />
      {id ? (
        <>
          <QueryState
            pending={detail.isPending}
            error={detail.error}
            retry={() => void detail.refetch()}
          />
          {order && (
            <div className="space-y-5">
              <Notice>
                This preserves earlier return history. A completion reference
                alone does not verify a refund or stock adjustment.
              </Notice>
              <Card>
                <Details
                  values={{
                    Customer: order.customer,
                    Status: order.status,
                    Request: order.returnRequestId,
                    Preference: order.returnPreference,
                    Reason: order.returnReason,
                    Description: order.returnDescription,
                    Total: money(order.total),
                    Payment: `${order.paymentMethod} · ${order.paymentStatus}`,
                    Address: Object.values(order.shippingAddress)
                      .filter(Boolean)
                      .join(", "),
                    Feedback: order.returnReviewNote,
                    Reference: order.returnReference,
                  }}
                />
              </Card>
              <Card>
                <h2 className="mb-4 font-bold">Order activity</h2>
                <Details
                  values={{
                    Placed: order.createdAt,
                    Received: order.receivedAt,
                    Requested: order.returnRequestedAt,
                    Reviewed: order.returnReviewedAt,
                    Completed: order.returnCompletedAt,
                  }}
                />
                {order.shipments.map((shipment, index) => (
                  <p key={index} className="mt-3 text-sm">
                    {shipment.storeName ?? `Shipment ${index + 1}`} ·{" "}
                    {shipment.status} · {shipment.dispatchedAt}
                  </p>
                ))}
              </Card>
              <Card>
                <h2 className="mb-4 font-bold">Order items</h2>
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-3 py-3">
                    {item.coverImage && (
                      <img
                        src={item.coverImage}
                        alt=""
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                    )}
                    <p className="text-sm">
                      {item.name} ·{" "}
                      {[item.storeName, item.color, item.size]
                        .filter(Boolean)
                        .join(" / ")}{" "}
                      × {item.quantity} · {money(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-5 max-w-xs">
            <Select
              label="Earlier request status"
              value={filter}
              onChange={(value) => url.set({ status: value })}
              options={["open", "closed", "all"]}
            />
          </div>
          <QueryState
            pending={query.isPending}
            error={query.error}
            retry={() => void query.refetch()}
          />
          {query.data?.pages
            .flatMap((page) => page.returns)
            .map((order) => (
              <Card key={order.id} className="mb-4">
                <h2 className="font-bold">{order.customer}</h2>
                <div className="my-3">
                  <Badge>{order.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="text-sm">
                  {order.returnRequestId} · {order.returnPreference} ·{" "}
                  {money(order.total)}
                </p>
                <Link
                  prefetch={false}
                  href={`/admin/support/earlier/${order.id}`}
                  className="mt-4 inline-block font-semibold text-purple-800"
                >
                  View history →
                </Link>
              </Card>
            ))}
          {query.hasNextPage && (
            <Button
              variant="secondary"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              Load more earlier requests
            </Button>
          )}
        </>
      )}
    </>
  );
}
