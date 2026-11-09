"use client";
import { useState } from "react";
import type { ReturnCase, RefundPayout } from "../../../lib/contracts/returns";
import { reasonLabels } from "../../../lib/contracts/returns";
import {
  currentStatus,
  milestonesFor,
  completed,
  milestoneTime,
} from "./progress-model";
import { nextStepFor } from "./support-model";
import { supportApi } from "./support-api";
import { EvidencePhotos } from "./evidence-photos";
import { Badge, Button, Card, Details, Notice } from "../../../components/ui";
import { money } from "../../../lib/format";
const address = (value: ReturnCase["pickupAddress"]) =>
  [
    value.name,
    value.phone,
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
function RefundDetails({ record }: { record: ReturnCase }) {
  const [payout, setPayout] = useState<RefundPayout | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (record.preference !== "refund") return null;
  if (record.refundMethod === "original")
    return (
      <Notice>
        Approved refunds return to the original payment method. Completion
        appears after provider verification.
      </Notice>
    );
  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold">Refund details</h2>
      <p className="mb-4 text-sm">
        {record.payoutSummary || "Payout details needed"}
      </p>
      {payout ? (
        <>
          <Details
            values={
              payout.method === "bank"
                ? {
                    Holder: payout.accountHolder,
                    Account: payout.accountNumber,
                    IFSC: payout.ifsc,
                  }
                : payout.method === "upi"
                  ? { "UPI ID": payout.upiId }
                  : { Method: "Cash" }
            }
          />
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => setPayout(null)}
          >
            Hide details
          </Button>
        </>
      ) : (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const response = await supportApi.payout(record);
              setPayout(response.payout);
              if (!response.payout)
                setError("The customer has not added payout details yet.");
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Could not load payout.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          View payout details
        </Button>
      )}
      {error && <Notice error>{error}</Notice>}
    </Card>
  );
}
export function CaseDetails({ record }: { record: ReturnCase }) {
  const milestones = milestonesFor(record).filter(
    (milestone) =>
      !["rejected", "cancelled"].includes(record.status) ||
      completed(record, milestone),
  );
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="mb-4 text-lg font-bold">Return / exchange progress</h2>
        <Badge>{currentStatus(record)}</Badge>
        <p className="my-4 text-sm leading-7">{nextStepFor(record, true)}</p>
        <ol className="space-y-3">
          {milestones.map((milestone) => (
            <li
              key={milestone.label}
              className="flex flex-wrap justify-between gap-3 text-sm"
            >
              <span>
                {completed(record, milestone) ? "✓" : "○"} {milestone.label}
              </span>
              <span className="text-slate-500">
                {completed(record, milestone)
                  ? milestoneTime(record, milestone)
                  : "Not yet recorded"}
              </span>
            </li>
          ))}
        </ol>
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">{record.requestId}</h2>
        <Details
          values={{
            Preference: record.preference,
            Amount: money(record.amount),
            Reason: reasonLabels[record.reason],
            Description: record.description,
            "Refund method": record.refundMethod,
            Reference: record.reference,
            "Reply requested by": record.proofDueAt,
            Created: record.createdAt,
            Updated: record.updatedAt,
          }}
        />
        <div className="my-5 space-y-3">
          {record.items.map((item) => (
            <p key={item.index} className="text-sm">
              {item.name} ·{" "}
              {[item.color, item.size].filter(Boolean).join(" / ")} ×{" "}
              {item.quantity}
              {record.preference === "exchange" &&
                ` · Replacement: ${[item.exchangeColor, item.exchangeSize].filter(Boolean).join(" / ") || "Same product"}`}
            </p>
          ))}
        </div>
        <EvidencePhotos orderId={record.orderId} ids={record.photoIds} />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">Pickup & replacement</h2>
        <Details
          values={{
            Address: address(record.pickupAddress),
            "Requested address":
              record.proposedAddress && address(record.proposedAddress),
            "Address change": record.addressChangeRequested
              ? "Awaiting confirmation"
              : "None",
            "Collection method": record.pickup?.mode,
            "Window start": record.pickup?.start,
            "Window end": record.pickup?.end,
            Contact: record.pickup?.contact,
            Reference: record.pickup?.reference,
            Instructions: record.pickup?.instructions,
            Carrier: record.replacement?.carrier,
            "Replacement reference": record.replacement?.reference,
            Dispatched: record.replacement?.dispatchedAt,
          }}
        />
      </Card>
      {record.inventory && (
        <Card>
          <h2 className="mb-4 text-lg font-bold">Inventory</h2>
          <p className="text-sm">
            Replacement stock: {record.inventory.replacement ?? "Not reserved"}
          </p>
          {record.inventory.inspectedAt &&
            record.items.map((item) => (
              <p key={item.index} className="mt-3 text-sm">
                {item.name} ·{" "}
                {record.inventory?.restockItems.find(
                  (entry) => entry.index === item.index,
                )?.quantity ?? 0}{" "}
                of {item.quantity} returned to sellable stock
              </p>
            ))}
        </Card>
      )}
      <RefundDetails key={`${record.id}:${record.version}`} record={record} />
    </div>
  );
}
