"use client";
import { useState } from "react";
import { rtoApi } from "../../../lib/api/rto-api";
import type { SellerOrder } from "./orders-api";
import { Card, Details, Field, Notice } from "../../../components/ui";
import { ConfirmButton } from "../../../components/confirm-button";
export function SellerRtoPanel({
  order,
  refresh,
}: {
  order: SellerOrder;
  refresh: () => Promise<void>;
}) {
  const rto = order.rto;
  const seller = rto?.sellers?.[0];
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [sellable, setSellable] = useState<Record<number, string>>({});
  if (!rto || !seller) return null;
  const dispute =
    rto.status === "inspection_disputed" &&
    rto.disputedStoreId === seller.storeId &&
    seller.status === "received";
  const receipt =
    (rto.expectedRecipient === "seller" &&
      rto.sellers?.length === 1 &&
      rto.status === "returning" &&
      seller.status === "pending") ||
    (rto.expectedRecipient === "admin" &&
      rto.status === "seller_receipt_pending" &&
      seller.status === "transferred") ||
    dispute;
  const lines = order.items.filter((item) => item.itemIndex !== undefined);
  const received = new Map(
    seller.receivedItems.map((item) => [item.index, item.quantity]),
  );
  const receiptItems = lines.map((item) => ({
    index: item.itemIndex!,
    quantity:
      counts[item.itemIndex!] === undefined
        ? -1
        : Number(counts[item.itemIndex!]),
  }));
  const inspectionItems = lines
    .filter((item) => received.has(item.itemIndex!))
    .map((item) => ({
      index: item.itemIndex!,
      quantity:
        sellable[item.itemIndex!] === undefined
          ? -1
          : Number(sellable[item.itemIndex!]),
    }));
  const validReceipt =
    lines.length > 0 &&
    receiptItems.every(
      (item) =>
        Number.isSafeInteger(item.quantity) &&
        item.quantity >= 0 &&
        item.quantity <=
          (lines.find((line) => line.itemIndex === item.index)?.quantity ?? 0),
    );
  const validInspection =
    inspectionItems.length === received.size &&
    inspectionItems.length > 0 &&
    inspectionItems.every(
      (item) =>
        Number.isSafeInteger(item.quantity) &&
        item.quantity >= 0 &&
        item.quantity <= (received.get(item.index) ?? 0),
    );
  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold">Return to origin</h2>
      <Details
        values={{
          Status: rto.status.replaceAll("_", " "),
          Reason: rto.reason,
          Custodian: rto.currentCustodian,
          Recipient: rto.expectedRecipient,
          "Seller parcel status": seller.status,
          Refund: rto.refund.status,
        }}
      />
      {receipt && (
        <div className="mt-5 space-y-4">
          <Notice>
            Count every item physically received. A mismatch blocks completion
            and requires a recount.
          </Notice>
          {lines.map((item) => (
            <Field
              key={item.itemIndex}
              label={`Received quantity for ${item.name}`}
              value={counts[item.itemIndex!] ?? ""}
              onChange={(event) =>
                setCounts((previous) => ({
                  ...previous,
                  [item.itemIndex!]: event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 2),
                }))
              }
              maxLength={2}
              inputMode="numeric"
            />
          ))}
          <ConfirmButton
            label={dispute ? "Record recount" : "Confirm physical receipt"}
            title="Confirm received quantities?"
            message="Confirm only the units physically received. This does not restore stock."
            disabled={!validReceipt}
            onConfirm={async () => {
              await rtoApi.sellerReceipt(order.id, receiptItems);
              setCounts({});
              await refresh();
            }}
          />
        </div>
      )}
      {seller.status === "received" &&
        ["inspection", "seller_receipt_pending"].includes(rto.status) &&
        !dispute && (
          <div className="mt-5 space-y-4">
            <Notice>
              Record inspected sellable quantities only. Use 0 for damaged or
              unsellable units.
            </Notice>
            {lines
              .filter((item) => received.has(item.itemIndex!))
              .map((item) => (
                <Field
                  key={item.itemIndex}
                  label={`Sellable quantity for ${item.name}`}
                  value={sellable[item.itemIndex!] ?? ""}
                  onChange={(event) =>
                    setSellable((previous) => ({
                      ...previous,
                      [item.itemIndex!]: event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 2),
                    }))
                  }
                  maxLength={2}
                  inputMode="numeric"
                />
              ))}
            <ConfirmButton
              label="Confirm inspection"
              title="Record inspected sellable quantities?"
              message="Stock restores only after Admin completes COD recovery or a prepaid refund is verified."
              disabled={!validInspection}
              onConfirm={async () => {
                await rtoApi.sellerInspection(order.id, inspectionItems);
                setSellable({});
                await refresh();
              }}
            />
          </div>
        )}
      <div className="mt-5 space-y-3">
        {seller.receivedItems.map((item) => (
          <p key={`received:${item.index}`} className="text-sm">
            {lines.find((line) => line.itemIndex === item.index)?.name} ·
            Received {item.quantity}
          </p>
        ))}
        {seller.sellableItems.map((item) => (
          <p key={`sellable:${item.index}`} className="text-sm">
            {lines.find((line) => line.itemIndex === item.index)?.name} ·
            Sellable {item.quantity}
          </p>
        ))}
        {seller.missingItems?.map((item) => (
          <p key={`missing:${item.index}`} className="text-sm">
            Missing {item.quantity}
          </p>
        ))}
        {seller.damagedItems?.map((item) => (
          <p key={`damaged:${item.index}`} className="text-sm">
            Damaged {item.quantity}
          </p>
        ))}
        <Details
          values={{
            Transferred: seller.transferredAt,
            Received: seller.receivedAt,
            Inspected: seller.inspectedAt,
            Restocked: seller.restockedAt,
          }}
        />
      </div>
      {rto.status === "recovery_failed" && (
        <Notice error>
          Recovery needs manual support. No inventory was restored or payout
          finalized.
        </Notice>
      )}
    </Card>
  );
}
