export type FulfillmentStep = {
  status: string;
  state: "complete" | "current" | "upcoming";
  at: string | null;
};
export type FulfillmentProgress = {
  fulfillmentStatus?: string;
  fulfillmentTimeline?: FulfillmentStep[];
};
export const fulfillmentLabels: Record<string, string> = {
  placed: "Confirmed",
  preparing: "Confirmed",
  packed: "Confirmed",
  ready_for_dispatch: "Confirmed",
  dispatched: "Dispatched",
  out_for_delivery: "Dispatched",
  delivered: "Delivered",
};
export const fulfillmentNotes: Record<string, string> = {
  placed:
    "Order confirmed. The seller will pack and hand over your parcel for delivery.",
  preparing: "The seller is preparing and packing your items for admin pickup.",
  packed: "Your items are packed. The seller will mark them ready for pickup.",
  ready_for_dispatch: "Packed and ready. Awaiting pickup by the delivery team.",
  dispatched: "The seller has handed your parcel to admin for delivery.",
  out_for_delivery: "The delivery team is on the final leg to your address.",
  delivered: "Delivery confirmed.",
};
export function fulfillmentLabel(status: string) {
  return fulfillmentLabels[status] ?? status.replaceAll("_", " ");
}
export function currentFulfillment(
  order: FulfillmentProgress & { status: string },
) {
  const status = order.fulfillmentStatus ?? order.status;
  return (
    (
      {
        preparing: "placed",
        packed: "placed",
        ready_for_dispatch: "placed",
        out_for_delivery: "dispatched",
      } as Record<string, string>
    )[status] ?? status
  );
}
export function isShipping(order: FulfillmentProgress & { status: string }) {
  return (
    Object.hasOwn(fulfillmentLabels, currentFulfillment(order)) &&
    currentFulfillment(order) !== "delivered"
  );
}
