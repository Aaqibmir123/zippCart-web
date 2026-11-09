import type { AdminOrderDetail } from "./shipping-api";
import { EvidencePhotos } from "../support/evidence-photos";
import { Card, Details } from "../../../components/ui";
import { money } from "../../../lib/format";
export function RtoHistory({ order }: { order: AdminOrderDetail }) {
  const rto = order.rto;
  if (!rto) return null;
  const items = order.sellers.flatMap((seller) => seller.items);
  const name = (index: number) =>
    items.find((item) => item.index === index)?.name ?? `Item ${index}`;
  return (
    <Card>
      <h2 className="mb-5 text-lg font-bold">
        Return to origin · {rto.status.replaceAll("_", " ")}
      </h2>
      <Details
        values={{
          Reason: rto.reason,
          "Physical custodian": rto.currentCustodian,
          "Expected recipient": rto.expectedRecipient,
          Refund: rto.refund.status,
          Amount: rto.refund.amountPaise
            ? money(rto.refund.amountPaise / 100)
            : undefined,
          "Admin receipt":
            rto.adminReceivedAt &&
            new Date(rto.adminReceivedAt).toLocaleString("en-IN"),
        }}
      />
      {rto.adminReceivedItems?.map((item) => (
        <p key={item.index} className="mt-3 text-sm">
          {name(item.index)} · Received {item.quantity} · Missing{" "}
          {rto.adminReceivedMissingItems?.find(
            (value) => value.index === item.index,
          )?.quantity ?? 0}{" "}
          · Damaged{" "}
          {rto.adminReceivedDamagedItems?.find(
            (value) => value.index === item.index,
          )?.quantity ?? 0}
        </p>
      ))}
      {rto.sellers?.map((seller) => (
        <section
          key={seller.storeId}
          className="mt-5 border-t border-slate-100 pt-4"
        >
          <h3 className="font-semibold">
            {order.sellers.find((value) => value.storeId === seller.storeId)
              ?.storeName ?? "Seller"}{" "}
            · {seller.status}
          </h3>
          <Details
            values={{
              Transferred: seller.transferredAt,
              Received: seller.receivedAt,
              Inspected: seller.inspectedAt,
              Restocked: seller.restockedAt,
            }}
          />
          {[
            ["Received", seller.receivedItems],
            ["Missing", seller.missingItems],
            ["Damaged", seller.damagedItems],
            ["Sellable", seller.sellableItems],
          ].map(([label, entries]) =>
            (entries as { index: number; quantity: number }[] | undefined)?.map(
              (item) => (
                <p key={`${label}:${item.index}`} className="mt-2 text-sm">
                  {name(item.index)} · {label as string} {item.quantity}
                </p>
              ),
            ),
          )}
        </section>
      ))}
      <h3 className="mb-3 mt-6 font-bold">Recovery history</h3>
      {rto.history.map((event, index) => (
        <div key={index} className="space-y-3 border-t border-slate-100 py-4">
          <p className="text-sm font-semibold">
            {event.action.replaceAll("_", " ")} · {event.actorRole} ·{" "}
            {new Date(event.at).toLocaleString("en-IN")}
          </p>
          <p className="text-sm">{event.note}</p>
          {event.items?.map((item) => (
            <p key={item.index} className="text-sm">
              {name(item.index)}: received {item.quantity}
            </p>
          ))}
          {event.missingItems?.map((item) => (
            <p key={item.index} className="text-sm">
              {name(item.index)}: missing {item.quantity}
            </p>
          ))}
          {event.damagedItems?.map((item) => (
            <p key={item.index} className="text-sm">
              {name(item.index)}: damaged {item.quantity}
            </p>
          ))}
          {!!event.photoIds?.length && (
            <EvidencePhotos orderId={order.id} ids={event.photoIds} />
          )}
        </div>
      ))}
    </Card>
  );
}
