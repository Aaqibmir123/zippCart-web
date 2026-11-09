"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { adminShippingApi, type ShippingAddress } from "./shipping-api";
import { RtoActions } from "./rto-actions";
import { RtoHistory } from "./rto-history";
import { useScreenActive } from "../../../lib/hooks/use-page-active";
import { settlementNote } from "../../../lib/earnings/settlement-model";
import { money } from "../../../lib/format";
import { FulfillmentTimeline } from "../../../components/fulfillment-timeline";
import {
  Badge,
  Button,
  Card,
  Details,
  Heading,
  Notice,
  QueryState,
} from "../../../components/ui";

const addressText = (value: ShippingAddress) =>
  [
    value.line1,
    value.locality,
    value.landmark,
    value.district,
    value.city,
    value.state,
    value.pincode,
  ]
    .filter(Boolean)
    .join(", ");
export function AdminOrderDetailScreen({ id }: { id: string }) {
  const { user } = useAuth();
  const active = useScreenActive();
  const client = useQueryClient();
  const router = useRouter();
  const query = useQuery({
    queryKey: ["admin-shipping-detail", user?.id, id],
    queryFn: () => adminShippingApi.detail(id),
    enabled: active && !!user?.roles?.includes("admin"),
    refetchInterval: active ? 30000 : false,
  });
  const order = query.data?.order;
  const restricted = user?.reviewer === true || order?.reviewerOrder === true;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function refresh() {
    await Promise.all(
      [
        "admin-shipping-detail",
        "admin-shipping-ready",
        "admin-shipping-all",
        "admin-rto",
        "shipping-operations",
        "seller-orders",
        "earnings",
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  }
  const canGenerate =
    !restricted &&
    !!order &&
    ["placed", "dispatched", "out_for_delivery"].includes(order.status) &&
    !!order.sellers.length &&
    order.sellers.every(
      (seller) =>
        !seller.stockIssueOpen &&
        [
          "placed",
          "preparing",
          "packed",
          "ready_for_dispatch",
          "dispatched",
          "out_for_delivery",
        ].includes(seller.status),
    );
  async function label() {
    if (lock.current || restricted || !order) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (!order.label) await adminShippingApi.generateLabel(id);
      await refresh();
      router.push(`/admin/shipping/${id}/label`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not prepare label.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Link
        prefetch={false}
        href="/admin/shipping"
        className="mb-5 inline-block text-purple-800"
      >
        ← Orders & shipping
      </Link>
      <Heading
        title={`Order #${order?.publicReference ?? id.slice(-8).toUpperCase()}`}
        description={`Full ID: ${id}`}
        actions={
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Refresh order
          </Button>
        }
      />
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {error && <Notice error>{error}</Notice>}
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
                Items: order.itemCount,
                Total: money(order.total),
                Method: order.paymentMethod.toUpperCase(),
                Payment: order.paymentStatus,
                Status: order.status,
              }}
            />
          </Card>
          {order.cancellation ? (
            <Notice>
              Cancelled by customer: {order.cancellation.reason} ·{" "}
              {new Date(order.cancellation.at).toLocaleString("en-IN")}. No COD
              collection or payout due.
            </Notice>
          ) : restricted ? (
            <Notice>
              Synthetic review order. No delivery, cash collection or payout
              will be arranged.
            </Notice>
          ) : (
            <FulfillmentTimeline order={order} />
          )}
          {["dispatched", "out_for_delivery"].includes(order.status) &&
            !restricted && (
              <Notice>
                The customer must confirm receipt in their order details. Only
                then is the order marked delivered and the return window opened.
              </Notice>
            )}
          {!!order.settlements.length && (
            <Card>
              <h2 className="mb-4 text-lg font-bold">Payout & commission</h2>
              {order.settlements.map((value) => (
                <div
                  key={value.storeId}
                  className="space-y-3 border-b border-slate-100 py-4"
                >
                  <h3 className="font-semibold">
                    {
                      order.sellers.find(
                        (seller) => seller.storeId === value.storeId,
                      )?.storeName
                    }
                  </h3>
                  <Badge>{value.state}</Badge>
                  <p className="text-sm">{settlementNote(value)}</p>
                  <Details
                    values={{
                      "Net earnings": money(value.netPaise / 100),
                      Eligible: money(value.eligiblePaise / 100),
                      Commission: money(value.commissionPaise / 100),
                      "Payment verified": value.paymentVerified ? "Yes" : "No",
                      "Release at": value.releaseAt,
                    }}
                  />
                </div>
              ))}
            </Card>
          )}
          {order.rto && (
            <>
              <RtoHistory order={order} />
              {!restricted && !query.isError && (
                <RtoActions order={order} refresh={refresh} />
              )}
            </>
          )}
          {!!order.returnCases?.length ? (
            <Card>
              <h2 className="mb-4 text-lg font-bold">Returns & refunds</h2>
              {order.refundStatus && (
                <p className="mb-3 text-sm">
                  Refund status: {order.refundStatus}
                </p>
              )}
              {order.returnCases.map((record) => (
                <section
                  key={record.id}
                  className="space-y-3 border-t border-slate-100 py-4"
                >
                  <Link
                    prefetch={false}
                    className="font-semibold text-purple-800"
                    href={`/admin/support/${id}/${record.id}`}
                  >
                    {record.preference} · {record.status.replaceAll("_", " ")}
                  </Link>
                  <Details
                    values={{
                      Reason: record.reason,
                      Amount:
                        record.amount !== undefined
                          ? money(record.amount)
                          : undefined,
                      Method: record.refundMethod,
                      Reference: record.reference,
                      Created: record.createdAt,
                      Updated: record.updatedAt,
                    }}
                  />
                  {record.history.map((event, index) => (
                    <p key={index} className="text-xs">
                      {event.action ?? event.status} · {event.actor} ·{" "}
                      {event.at && new Date(event.at).toLocaleString("en-IN")}
                    </p>
                  ))}
                </section>
              ))}
            </Card>
          ) : (
            order.returnRequestedAt && (
              <Card>
                <h2 className="mb-4 font-bold">Earlier return request</h2>
                <Details
                  values={{
                    Preference: order.returnPreference,
                    Reason: order.returnReason,
                    Description: order.returnDescription,
                    Feedback: order.returnReviewNote,
                    Reference: order.returnReference,
                    Requested: order.returnRequestedAt,
                    Reviewed: order.returnReviewedAt,
                    Completed: order.returnCompletedAt,
                  }}
                />
              </Card>
            )
          )}
          <Card>
            <h2 className="mb-4 text-lg font-bold">Customer & delivery</h2>
            <Details
              values={{
                Customer: order.shippingAddress.name,
                Phone: order.shippingAddress.phone,
                Address: addressText(order.shippingAddress),
              }}
            />
            {!restricted &&
              /^\+?\d{10,15}$/.test(
                order.shippingAddress.phone.replace(/[\s()-]/g, ""),
              ) && (
                <a
                  href={`tel:${order.shippingAddress.phone.replace(/[\s()-]/g, "")}`}
                  className="mt-4 inline-block font-semibold text-purple-800"
                >
                  Call customer
                </a>
              )}
          </Card>
          {!restricted && (
            <Card>
              <h2 className="mb-4 text-lg font-bold">Order location</h2>
              {order.location?.status === "captured" &&
              order.location.sample ? (
                <Details
                  values={{
                    Latitude: order.location.sample.latitude.toFixed(6),
                    Longitude: order.location.sample.longitude.toFixed(6),
                    Accuracy:
                      order.location.sample.accuracy === null
                        ? "Unavailable"
                        : `${Math.round(order.location.sample.accuracy)} metres`,
                    Captured: new Date(
                      order.location.sample.capturedAt,
                    ).toLocaleString("en-IN"),
                  }}
                />
              ) : (
                <p className="text-sm">
                  {order.location?.status === "denied"
                    ? "Customer did not grant location permission."
                    : order.location?.status === "unavailable"
                      ? "Device location could not be captured or securely saved."
                      : "No device location was recorded for this order."}
                </p>
              )}
              <p className="mt-4 text-xs text-slate-500">
                Customer device location at checkout; it is not a verified
                delivery pin.
              </p>
            </Card>
          )}
          {order.sellers.map((seller) => (
            <Card key={seller.storeId}>
              <h2 className="mb-4 text-lg font-bold">{seller.storeName}</h2>
              <Details
                values={{
                  Seller: seller.ownerName,
                  Phone: seller.phone,
                  Address: seller.address,
                  Status: seller.status,
                  Operations: seller.operations.stage,
                }}
              />
              {seller.stockIssueOpen && (
                <Notice error>
                  Open stock issue. Resolve it in Attention before dispatch.
                </Notice>
              )}
              {!restricted &&
                seller.phone &&
                /^\+?\d{10,15}$/.test(seller.phone.replace(/[\s()-]/g, "")) && (
                  <a
                    href={`tel:${seller.phone.replace(/[\s()-]/g, "")}`}
                    className="mt-4 inline-block text-purple-800"
                  >
                    Call seller
                  </a>
                )}
              <div className="mt-5 space-y-3">
                {seller.items.map((item, index) => (
                  <p key={index} className="text-sm">
                    {item.name} ·{" "}
                    {[item.color, item.size].filter(Boolean).join(" / ")} ×{" "}
                    {item.quantity} · {money(item.price)} each ·{" "}
                    {money(item.quantity * item.price)}
                  </p>
                ))}
              </div>
            </Card>
          ))}
          <Card>
            <h2 className="mb-4 text-lg font-bold">Dispatch & payment</h2>
            <Details
              values={{
                "Expected dispatch": order.expectedDispatchDate,
                "Estimated delivery": order.deliveryEta,
                "Delay reason": order.dispatchDelayReason,
                Subtotal: money(order.subtotal),
                Delivery: money(order.delivery),
                Total: money(order.total),
                Label: order.label?.reference,
              }}
            />
            {order.billingAddress && (
              <div className="mt-5">
                <h3 className="mb-3 font-semibold">Billing address</h3>
                <p className="text-sm">
                  {order.billingAddress.name} ·{" "}
                  {addressText(order.billingAddress)}
                </p>
              </div>
            )}
          </Card>
          {!restricted && (order.label || canGenerate) && (
            <Button
              disabled={busy || query.isFetching || query.isError}
              onClick={() => void label()}
            >
              {busy
                ? "Preparing label…"
                : order.label
                  ? "View / print label"
                  : "Generate shipping label"}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
