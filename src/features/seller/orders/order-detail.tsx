"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { loadOwnedOrder } from "./owned-order";
import { sellerOrderApi } from "./orders-api";
import { SellerRtoPanel } from "./rto-panel";
import { StockIssue } from "./stock-issue";
import {
  sellerLegacyReturnPresentation,
  sellerReturnPresentation,
} from "./return-presentation";
import { useScreenActive } from "../../../lib/hooks/use-page-active";
import { reasonLabels } from "../../../lib/contracts/returns";
import { money } from "../../../lib/format";
import { settlementNote } from "../../../lib/earnings/settlement-model";
import { FulfillmentTimeline } from "../../../components/fulfillment-timeline";
import { ConfirmButton } from "../../../components/confirm-button";
import {
  Badge,
  Button,
  Card,
  Details,
  Heading,
  Notice,
  QueryState,
} from "../../../components/ui";

export function SellerOrderDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const active = useScreenActive();
  const query = useQuery({
    queryKey: ["seller-owned-order", user?.id, id],
    queryFn: ({ signal }) => loadOwnedOrder(id, [], signal),
    enabled: active,
    retry: false,
    refetchInterval: active ? 30000 : false,
  });
  const order = query.data;
  const viewed = useRef("");
  const [viewError, setViewError] = useState("");
  async function markViewed() {
    try {
      await sellerOrderApi.viewed(id);
      setViewError("");
    } catch (cause) {
      setViewError(
        cause instanceof Error ? cause.message : "Could not mark order viewed.",
      );
    }
  }
  useEffect(() => {
    if (
      order &&
      viewed.current !== `${user?.id}:${id}` &&
      !order.reviewerRedacted
    ) {
      viewed.current = `${user?.id}:${id}`;
      void markViewed();
    }
  }, [order?.id, user?.id, id]);
  async function refresh() {
    await Promise.all(
      [
        "seller-orders",
        "seller-owned-order",
        "admin-shipping-detail",
        "seller-products",
        "seller-product",
        "inventory-alerts",
        "earnings",
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  }
  const scheduledForLater =
    !!order?.expectedDispatchDate &&
    new Date(new Date(order.expectedDispatchDate).getTime() + 330 * 60000)
      .toISOString()
      .slice(0, 10) >
      new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  return (
    <>
      <Link
        prefetch={false}
        href="/seller/orders"
        className="mb-5 inline-block font-semibold text-purple-800"
      >
        ← Orders
      </Link>
      <Heading
        title={`Order #${id.slice(-8).toUpperCase()}`}
        description={`Full ID: ${id}`}
      />
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {viewError && (
        <Notice error>
          {viewError}
          <Button variant="secondary" onClick={() => void markViewed()}>
            Retry viewed marker
          </Button>
        </Notice>
      )}
      {order && (
        <div className="space-y-5">
          <Card>
            <div className="mb-4 flex flex-wrap gap-3">
              <Badge>{order.operations.stage}</Badge>
              {order.operations.support.map((value) => (
                <Badge key={value}>{value}</Badge>
              ))}
            </div>
            <Details
              values={{
                Placed: new Date(order.createdAt).toLocaleString("en-IN"),
                Status: order.status,
                Items: order.items.reduce(
                  (sum, item) => sum + item.quantity,
                  0,
                ),
                "Your items total": order.reviewerRedacted
                  ? "Hidden in review mode"
                  : money(order.subtotal),
                Payment: order.reviewerRedacted
                  ? "Hidden in review mode"
                  : `${order.paymentMethod} · ${order.paymentStatus}`,
              }}
            />
          </Card>
          {order.cancellation && (
            <Notice>
              Cancelled by customer · {order.cancellation.reason} ·{" "}
              {order.cancellation.at}. No COD payment or seller payout is due.
              {order.cancellation.stockRestoredAt &&
                ` Stock restored ${order.cancellation.stockRestoredAt}.`}
            </Notice>
          )}
          <Card>
            <h2 className="mb-4 text-lg font-bold">Items to fulfil</h2>
            {order.items.map((item, index) => (
              <div
                key={index}
                className="flex gap-4 border-t border-slate-100 py-4"
              >
                {item.coverImage && (
                  <img
                    src={item.coverImage}
                    alt=""
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                )}
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="mt-2 text-sm">
                    {[item.color, item.size].filter(Boolean).join(" / ")} ·
                    Quantity {item.quantity}
                  </p>
                  {!order.reviewerRedacted && (
                    <p className="mt-2 text-sm">
                      {money(item.price)} each ·{" "}
                      {money(item.price * item.quantity)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-bold">Customer & delivery</h2>
            {order.reviewerRedacted ? (
              <Notice>
                Customer and financial details are hidden in reviewer mode.
              </Notice>
            ) : (
              <Details
                values={{
                  Customer: order.customer,
                  Phone: order.shippingAddress.phone,
                  Address: [
                    order.shippingAddress.line1,
                    order.shippingAddress.locality,
                    order.shippingAddress.landmark,
                    order.shippingAddress.district,
                    order.shippingAddress.city,
                    order.shippingAddress.state,
                    order.shippingAddress.pincode,
                  ]
                    .filter(Boolean)
                    .join(", "),
                }}
              />
            )}
          </Card>
          {!order.reviewerOrder && order.status !== "cancelled" && (
            <FulfillmentTimeline order={order} />
          )}
          {order.expectedDispatchDate && (
            <Notice>
              Scheduled dispatch:{" "}
              {new Date(order.expectedDispatchDate).toLocaleDateString(
                "en-IN",
                { timeZone: "Asia/Kolkata" },
              )}
              .
              {scheduledForLater &&
                " Handover is unavailable before the scheduled day."}
            </Notice>
          )}
          {order.stockIssue?.open && (
            <Notice error>
              Dispatch is blocked by a stock issue: {order.stockIssue.note}
            </Notice>
          )}
          {order.settlement && (
            <Card>
              <h2 className="mb-4 text-lg font-bold">Payout status</h2>
              <Badge>{order.settlement.state}</Badge>
              <p className="mt-3 text-sm">{settlementNote(order.settlement)}</p>
            </Card>
          )}
          {order.rto && !query.isError && (
            <SellerRtoPanel order={order} refresh={refresh} />
          )}
          {(order.returnRequestedAt || !!order.returnCases?.length) && (
            <Card>
              <h2 className="mb-4 text-lg font-bold">
                Return / exchange status
              </h2>
              {order.returnRequestedAt && !order.returnCases?.length && (
                <>
                  <p className="text-sm">
                    {
                      sellerLegacyReturnPresentation(
                        order.status,
                        order.returnPreference,
                      ).title
                    }
                  </p>
                  <p className="mt-2 text-sm">
                    {
                      sellerLegacyReturnPresentation(
                        order.status,
                        order.returnPreference,
                      ).next
                    }
                  </p>
                  <Details
                    values={{
                      Request: order.returnRequestId,
                      Preference: order.returnPreference,
                      Reason:
                        reasonLabels[
                          order.returnReason as keyof typeof reasonLabels
                        ] ?? order.returnReason,
                      Description: order.returnDescription,
                      Requested: order.returnRequestedAt,
                      Reviewed: order.returnReviewedAt,
                      Completed: order.returnCompletedAt,
                    }}
                  />
                </>
              )}
              {order.returnCases?.map((record) => (
                <section
                  key={record.id}
                  className="space-y-3 border-t border-slate-100 py-4"
                >
                  <h3 className="font-semibold">
                    RET-{record.id.toUpperCase()} ·{" "}
                    {
                      sellerReturnPresentation(record.status, record.preference)
                        .title
                    }
                  </h3>
                  <p className="text-sm">
                    {
                      sellerReturnPresentation(record.status, record.preference)
                        .next
                    }
                  </p>
                  <p className="text-sm">
                    {record.preference} ·{" "}
                    {reasonLabels[record.reason as keyof typeof reasonLabels] ??
                      record.reason}
                  </p>
                  <p className="text-sm">
                    Replacement stock: {record.inventory?.replacement ?? "None"}
                  </p>
                  {record.items.map((item, index) => (
                    <p key={index} className="text-sm">
                      {item.name} ·{" "}
                      {[item.color, item.size].filter(Boolean).join(" / ")} ×{" "}
                      {item.quantity}
                      {record.preference === "exchange" &&
                        ` · Replacement ${[item.exchangeColor, item.exchangeSize].filter(Boolean).join(" / ") || "Same variant"}`}
                      {record.inventory?.inspectedAt &&
                        ` · Restocked ${item.restockedQuantity ?? 0}`}
                    </p>
                  ))}
                  {record.inventory?.inspectedAt && (
                    <p className="text-xs">
                      Inspected {record.inventory.inspectedAt}
                    </p>
                  )}
                </section>
              ))}
            </Card>
          )}
          {!order.reviewerRedacted &&
            ["placed", "preparing", "packed", "ready_for_dispatch"].includes(
              order.status,
            ) && (
              <ConfirmButton
                label="Mark Dispatched"
                title="Confirm handover to admin"
                message="Confirm only after packing every item and physically handing this parcel to Admin for delivery."
                disabled={
                  scheduledForLater ||
                  !!order.stockIssue?.open ||
                  query.isError ||
                  query.isFetching
                }
                onConfirm={async () => {
                  await sellerOrderApi.dispatch(id);
                  await refresh();
                }}
              />
            )}
          {!order.reviewerRedacted && !query.isError && (
            <StockIssue order={order} refresh={refresh} />
          )}
        </div>
      )}
    </>
  );
}
