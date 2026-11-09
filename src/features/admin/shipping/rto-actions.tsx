"use client";
import { useRef, useState } from "react";
import type { AdminOrderDetail } from "./shipping-api";
import { adminShippingApi } from "./shipping-api";
import type { RtoAdminAction } from "../../../lib/api/rto-api";
import { EvidencePhotos } from "../support/evidence-photos";
import { ConfirmButton } from "../../../components/confirm-button";
import { Card, Field, Notice, TextArea } from "../../../components/ui";
import { money } from "../../../lib/format";

export function RtoActions({
  order,
  refresh,
}: {
  order: AdminOrderDetail;
  refresh: () => Promise<void>;
}) {
  const rto = order.rto;
  const [note, setNote] = useState("");
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [damaged, setDamaged] = useState<Record<number, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  if (!rto) return null;
  const lines = order.sellers.flatMap((seller) =>
    seller.items.map((item) => ({ ...item, storeName: seller.storeName })),
  );
  const items = lines
    .filter((item) => item.index !== undefined)
    .map((item) => ({
      index: item.index!,
      quantity:
        counts[item.index!] === undefined ? -1 : Number(counts[item.index!]),
    }));
  const damagedItems = lines
    .filter((item) => item.index !== undefined)
    .map((item) => ({
      index: item.index!,
      quantity:
        damaged[item.index!] === undefined ? -1 : Number(damaged[item.index!]),
    }));
  const validCounts =
    lines.length > 0 &&
    items.length === lines.length &&
    items.every(
      (item) =>
        Number.isSafeInteger(item.quantity) &&
        item.quantity >= 0 &&
        item.quantity <=
          (lines.find((line) => line.index === item.index)?.quantity ?? 0),
    );
  const validDamaged =
    validCounts &&
    damagedItems.length === items.length &&
    damagedItems.every(
      (item) =>
        Number.isSafeInteger(item.quantity) &&
        item.quantity >= 0 &&
        item.quantity <=
          (items.find((count) => count.index === item.index)?.quantity ?? -1),
    );
  const dispute =
    rto.status === "inspection_disputed" &&
    !rto.disputedStoreId &&
    rto.expectedRecipient === "admin";
  const receipt =
    (rto.status === "returning" && rto.expectedRecipient === "admin") ||
    dispute;
  const allInspected =
    !!rto.sellers?.length &&
    rto.sellers.every((seller) => seller.status === "inspected");
  async function run(body: RtoAdminAction) {
    if (lock.current) throw new Error("An update is already running.");
    lock.current = true;
    setBusy(true);
    try {
      await adminShippingApi.rtoAction(order.id, body);
      setNote("");
      setCounts({});
      setDamaged({});
      setPhotos([]);
      await refresh();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function action(
    label: string,
    message: string,
    body: RtoAdminAction,
    disabled = false,
  ) {
    return (
      <ConfirmButton
        label={label}
        title={`${label}?`}
        message={message}
        disabled={busy || photoBusy || disabled}
        onConfirm={() => run(body)}
      />
    );
  }
  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold">Manage recovery</h2>
      <div className="space-y-5">
        <TextArea
          label="RTO Admin note"
          value={note}
          onChange={setNote}
          maxLength={500}
          disabled={busy}
        />
        {rto.status === "requested" &&
          action(
            "Start review",
            "Record that Admin has started reviewing this request.",
            { action: "begin_review" },
          )}
        {["requested", "under_review"].includes(rto.status) && (
          <div className="flex flex-wrap gap-3">
            {action(
              "Approve recovery",
              "Approval does not confirm collection or physical receipt.",
              { action: "approve", note: note.trim() || undefined },
            )}
            {action(
              "Reject request",
              "The order remains active; the customer can still confirm delivery.",
              { action: "reject", note: note.trim() },
              note.trim().length < 3,
            )}
          </div>
        )}
        {rto.status === "recovery_pending" && (
          <div className="flex flex-wrap gap-3">
            {action(
              "Start coordination · Admin receives",
              "Record return coordination. Admin must separately confirm physical receipt.",
              {
                action: "start_return",
                recipient: "admin",
                note: note.trim() || undefined,
              },
            )}
            {order.sellers.length === 1 &&
              action(
                "Start coordination · Seller receives",
                "Record direct return coordination with this single seller.",
                {
                  action: "start_return",
                  recipient: "seller",
                  note: note.trim() || undefined,
                },
              )}
          </div>
        )}
        {receipt && (
          <>
            <Notice>
              Count every received item and damaged unit. A discrepancy blocks
              transfer, refund and restocking.
            </Notice>
            <div className="grid gap-4 sm:grid-cols-2">
              {lines.map((item) => (
                <div
                  key={item.index}
                  className="space-y-3 rounded-xl bg-slate-50 p-4"
                >
                  <p className="text-sm font-semibold">
                    {item.storeName} · {item.name} ·{" "}
                    {[item.color, item.size].filter(Boolean).join(" / ")} ·
                    Ordered {item.quantity}
                  </p>
                  <Field
                    label={`Received quantity for ${item.name}`}
                    value={counts[item.index ?? -1] ?? ""}
                    onChange={(event) =>
                      setCounts((previous) => ({
                        ...previous,
                        [item.index ?? -1]: event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 2),
                      }))
                    }
                    inputMode="numeric"
                    maxLength={2}
                    disabled={busy}
                  />
                  <Field
                    label={`Damaged quantity for ${item.name}`}
                    value={damaged[item.index ?? -1] ?? ""}
                    onChange={(event) =>
                      setDamaged((previous) => ({
                        ...previous,
                        [item.index ?? -1]: event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 2),
                      }))
                    }
                    inputMode="numeric"
                    maxLength={2}
                    disabled={busy}
                  />
                </div>
              ))}
            </div>
            <EvidencePhotos
              orderId={order.id}
              ids={photos}
              onChange={setPhotos}
              onBusy={setPhotoBusy}
              disabled={busy}
            />
            {action(
              dispute ? "Record recount" : "Record physical receipt",
              "Confirm the actual quantities and condition. This does not restore stock.",
              {
                action: dispute ? "reconcile_admin_receipt" : "receive_admin",
                items,
                damagedItems,
                note: note.trim(),
                ...(photos.length ? { photoIds: photos } : {}),
              },
              !validDamaged || note.trim().length < 3,
            )}
          </>
        )}
        {rto.status === "returning" && rto.expectedRecipient === "seller" && (
          <Notice>
            Awaiting the assigned Seller to record physical receipt.
          </Notice>
        )}
        {["admin_received", "seller_receipt_pending"].includes(rto.status) &&
          rto.expectedRecipient === "admin" &&
          rto.sellers
            ?.filter((seller) => seller.status === "pending")
            .map((seller) => (
              <div key={seller.storeId}>
                {action(
                  `Record physical handoff to ${order.sellers.find((entry) => entry.storeId === seller.storeId)?.storeName ?? "Seller"}`,
                  "The Seller must separately confirm physical receipt.",
                  { action: "transfer_to_seller", storeId: seller.storeId },
                )}
              </div>
            ))}
        {rto.status === "inspection" && (
          <>
            {!allInspected && (
              <Notice>
                Waiting for every Seller to confirm receipt and inspection.
              </Notice>
            )}
            {allInspected &&
              order.paymentMethod === "cod" &&
              order.paymentStatus === "unpaid" &&
              action(
                "Complete recovery · COD unpaid",
                "No COD was collected. Restore only inspected sellable quantities; no payout is due.",
                { action: "complete_cod", confirmation: true },
              )}
            {allInspected &&
              order.paymentMethod === "cod" &&
              order.paymentStatus !== "unpaid" && (
                <Notice error>
                  COD is marked paid. Financial reconciliation is required;
                  completion and restocking are blocked.
                </Notice>
              )}
            {allInspected &&
              order.paymentMethod === "razorpay" &&
              order.paymentStatus === "paid" &&
              action(
                "Authorize prepaid refund",
                `Request provider-verified refund of ${money(order.total)}. Inventory restores only after full provider confirmation.`,
                { action: "authorize_refund", confirmation: true },
              )}
          </>
        )}
        {[
          "recovery_pending",
          "returning",
          "admin_received",
          "inspection_disputed",
          "seller_receipt_pending",
          "inspection",
        ].includes(rto.status) &&
          action(
            "Record recovery failure",
            "Block completion and inventory restoration until support reconciles the case.",
            { action: "fail_recovery", note: note.trim() },
            note.trim().length < 3,
          )}
        {rto.status === "refund_pending" && (
          <Notice>
            Awaiting provider confirmation. Do not mark refund or inventory
            complete manually.
          </Notice>
        )}
        {rto.status === "recovery_failed" &&
          rto.refund.status === "failed" &&
          action(
            "Check provider status / retry refund",
            "Check the prior provider attempt first. Retry only when the provider confirms failure.",
            { action: "retry_refund", confirmation: true },
          )}
      </div>
    </Card>
  );
}
