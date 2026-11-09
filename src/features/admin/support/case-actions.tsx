"use client";
import { useRef, useState } from "react";
import type { AdminAction, ReturnCase } from "../../../lib/contracts/returns";
import { requestKey, statusLabels } from "../../../lib/contracts/returns";
import {
  actionsFor,
  inspectionItems,
  isoDate,
  localDate,
  type AdminActionName,
} from "./action-model";
import { supportApi } from "./support-api";
import { EvidencePhotos } from "./evidence-photos";
import { ConfirmButton } from "../../../components/confirm-button";
import {
  Card,
  Check,
  Field,
  Notice,
  Select,
  TextArea,
} from "../../../components/ui";

export function CaseActions({
  record,
  refresh,
}: {
  record: ReturnCase;
  refresh: () => Promise<void>;
}) {
  const actions = actionsFor(record);
  const [selected, setSelected] = useState<AdminActionName>("approve");
  const action =
    actions.find((item) => item.value === selected)?.value ?? actions[0]?.value;
  const [note, setNote] = useState("");
  const [fields, setFields] = useState({
    start: localDate(new Date(Date.now() + 86400000)),
    end: localDate(new Date(Date.now() + 90000000)),
    due: localDate(new Date(Date.now() + 172800000)),
    contact: "",
    reference: "",
    instructions: "",
    carrier: "",
    quantity: "",
    amount: String(record.amount),
  });
  const [mode, setMode] = useState<"pickup" | "dropoff">("pickup");
  const [sellable, setSellable] = useState<Record<number, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = useRef(requestKey());
  const required = [
    "approve",
    "reject",
    "schedule",
    "pickup_failed",
    "picked_up",
    "received",
    "inspection_pass",
    "inspection_dispute",
    "refund_complete",
    "dispatch_exchange",
    "complete_exchange",
  ].includes(action ?? "");
  const confirmations: Partial<Record<AdminActionName, string>> = {
    approve: "I reviewed the request and approve this return or exchange.",
    reject: "I reviewed the request and explained why it is being declined.",
    schedule:
      "The collection window and arrangement are confirmed with the customer.",
    pickup_failed: "A collection attempt took place and failed.",
    picked_up: "The parcel was physically collected.",
    received: "The returned parcel was physically received.",
    inspection_pass:
      "I inspected the actual items and confirmed received and sellable quantities.",
    inspection_dispute:
      "The inspection issue is documented with photo evidence.",
    refund_complete: "Payment receipt verified and refund actually completed.",
    dispatch_exchange:
      "Correct replacement stock confirmed and shipment actually dispatched.",
    complete_exchange: "The customer has actually received the replacement.",
  };
  function field(
    name: keyof typeof fields,
    label: string,
    numeric = false,
    maxLength = 100,
  ) {
    return (
      <Field
        label={label}
        value={fields[name]}
        onChange={(event) =>
          setFields((previous) => ({ ...previous, [name]: event.target.value }))
        }
        inputMode={numeric ? "numeric" : undefined}
        maxLength={maxLength}
        disabled={busy}
      />
    );
  }
  function build(): AdminAction {
    if (!action) throw new Error("No action is available at this stage.");
    const base = {
      version: record.version,
      clientKey: key.current,
      note: note.trim(),
    };
    if (
      action === "schedule" &&
      [fields.contact, fields.reference, fields.instructions].some(
        (value) => value.trim().length < 3,
      )
    )
      throw new Error(
        "Add contact, booking reference and packing instructions (at least 3 characters each).",
      );
    if (
      action === "inspection_pass" &&
      (!/^\d+$/.test(fields.quantity) || Number(fields.quantity) < 1)
    )
      throw new Error("Enter the actual number of items received.");
    if (
      action === "refund_complete" &&
      (Number(fields.amount) !== record.amount ||
        fields.reference.trim().length < 6)
    )
      throw new Error(
        `Enter the full refund amount (${record.amount}) and a receipt reference of at least 6 characters.`,
      );
    if (
      action === "dispatch_exchange" &&
      (fields.carrier.trim().length < 2 || fields.reference.trim().length < 3)
    )
      throw new Error(
        "Enter the delivery partner and replacement tracking reference.",
      );
    if (action === "ask_information")
      return { ...base, action, dueAt: isoDate(fields.due) };
    if (action === "schedule")
      return {
        ...base,
        action,
        acceptAddressChange: confirmed,
        pickup: {
          mode,
          start: isoDate(fields.start),
          end: isoDate(fields.end),
          contact: fields.contact.trim(),
          reference: fields.reference.trim(),
          instructions: fields.instructions.trim(),
        },
      };
    if (action === "inspection_pass")
      return {
        ...base,
        action,
        receivedQuantity: Number(fields.quantity),
        restockItems: inspectionItems(record, sellable),
      };
    if (action === "inspection_dispute")
      return { ...base, action, photoIds: photos };
    if (action === "refund_complete") {
      if (!record.refundMethod || record.refundMethod === "original")
        throw new Error("Original-payment refunds are verified automatically.");
      return {
        ...base,
        action,
        amount: Number(fields.amount),
        reference: fields.reference.trim(),
        method: record.refundMethod,
        paymentVerified: true,
      };
    }
    if (action === "dispatch_exchange")
      return {
        ...base,
        action,
        reference: fields.reference.trim(),
        carrier: fields.carrier.trim(),
        stockConfirmed: true,
      };
    return { ...base, action };
  }
  if (!action)
    return (
      <Notice>
        {record.status === "refund_pending" &&
        record.refundMethod === "original"
          ? "Wait for provider confirmation. Manual refund completion is unavailable."
          : "No Admin status action is available at this stage."}
      </Notice>
    );
  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold">Manage request</h2>
      <div className="space-y-5">
        <Notice>
          {statusLabels[record.status]} · Next valid actions:{" "}
          {actions.map((item) => item.label).join(", ")}
        </Notice>
        <Select
          label="Request action"
          value={action}
          onChange={(value) => {
            setSelected(value as AdminActionName);
            setConfirmed(false);
          }}
          options={actions}
          disabled={busy || photoBusy}
        />
        <TextArea
          label="Message for customer / action notes"
          value={note}
          onChange={setNote}
          disabled={busy}
        />
        {action === "ask_information" &&
          field("due", "Reply requested by (YYYY-MM-DD HH:mm, local time)")}
        {action === "schedule" && (
          <>
            <Select
              label="Collection method"
              value={mode}
              onChange={(value) => setMode(value as "pickup" | "dropoff")}
              options={[
                { value: "pickup", label: "Pickup" },
                { value: "dropoff", label: "Agreed drop-off" },
              ]}
            />
            {field("start", "Window start (YYYY-MM-DD HH:mm, local time)")}
            {field("end", "Window end (YYYY-MM-DD HH:mm, local time)")}
            {field("contact", "Collection contact", false, 120)}
            {field("reference", "Booking / arrangement reference")}
            {field(
              "instructions",
              "Packing and collection instructions",
              false,
              500,
            )}
          </>
        )}
        {action === "approve" && record.preference === "exchange" && (
          <Notice>
            Approval reserves the requested replacement size and color.
          </Notice>
        )}
        {action === "inspection_pass" && (
          <>
            {field("quantity", "Actual received quantity", true, 4)}
            <p className="text-sm">
              Restock only inspected sellable units; enter 0 for damaged, wrong
              or unsellable items.
            </p>
            {record.items.map((item) => (
              <Field
                key={item.index}
                label={`${item.name}: sellable quantity (0–${item.quantity})`}
                value={sellable[item.index] ?? ""}
                onChange={(event) =>
                  setSellable((previous) => ({
                    ...previous,
                    [item.index]: event.target.value,
                  }))
                }
                inputMode="numeric"
                maxLength={2}
                disabled={busy}
              />
            ))}
          </>
        )}
        {action === "inspection_dispute" && (
          <EvidencePhotos
            orderId={record.orderId}
            ids={photos}
            onChange={setPhotos}
            onBusy={setPhotoBusy}
            disabled={busy}
          />
        )}
        {action === "refund_complete" && (
          <>
            <Notice>
              Customer-selected method: {record.refundMethod?.toUpperCase()}.
              Record only after the actual refund.
            </Notice>
            {field("amount", "Actual refunded amount", true)}
            {field("reference", "Refund / cash receipt reference")}
          </>
        )}
        {action === "dispatch_exchange" && (
          <>
            {field("carrier", "Carrier / delivery partner")}
            {field("reference", "Replacement tracking / dispatch reference")}
          </>
        )}
        {required && (
          <Check
            label={confirmations[action] ?? "I verified this update."}
            checked={confirmed}
            onChange={setConfirmed}
            disabled={busy}
          />
        )}
        <ConfirmButton
          label="Confirm update"
          title={
            actions.find((item) => item.value === action)?.label ??
            "Confirm update"
          }
          message="This records the selected stage and your message for the customer. Confirm only the physical or financial event you have verified."
          danger={action === "reject"}
          disabled={
            busy ||
            photoBusy ||
            note.trim().length < 3 ||
            (required && !confirmed) ||
            (action === "inspection_dispute" && !photos.length)
          }
          onConfirm={async () => {
            const input = build();
            setBusy(true);
            try {
              await supportApi.action(record, input);
              key.current = requestKey();
              setNote("");
              setPhotos([]);
              setConfirmed(false);
              setFields((previous) => ({
                ...previous,
                reference: "",
                quantity: "",
              }));
              setSellable({});
              await refresh();
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </Card>
  );
}
