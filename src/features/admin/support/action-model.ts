import { AdminAction, ReturnCase } from "../../../lib/contracts/returns";

export type AdminActionName = Exclude<AdminAction["action"], "message">;
export function actionsFor(
  record: ReturnCase,
): { value: AdminActionName; label: string }[] {
  const actions: { value: AdminActionName; label: string }[] = [];
  const add = (value: AdminActionName, label: string) =>
    actions.push({ value, label });
  if (record.status === "under_review") {
    add("approve", "Approve");
    add("reject", "Reject");
  }
  if (
    ["pickup_pending", "pickup_failed", "pickup_scheduled"].includes(
      record.status,
    )
  )
    add("schedule", "Schedule collection");
  if (record.status === "pickup_scheduled") {
    add("picked_up", "Confirm collected");
    add("pickup_failed", "Pickup failed");
  }
  if (record.status === "picked_up") add("received", "Confirm received");
  if (["inspection", "inspection_disputed"].includes(record.status)) {
    add("inspection_pass", "Accept inspection");
    add("inspection_dispute", "Record inspection issue");
    if (record.status === "inspection_disputed")
      add("reject", "Close with reason");
  }
  if (record.status === "exchange_pending")
    add("dispatch_exchange", "Dispatch replacement");
  if (record.status === "replacement_dispatched")
    add("complete_exchange", "Confirm replacement delivered");
  if (record.status === "refund_pending" && record.refundMethod !== "original")
    add("refund_complete", "Record completed refund");
  if (
    record.status === "information_needed" &&
    ["under_review", "inspection_disputed"].includes(record.resumeStatus!)
  )
    add("reject", "Reject");
  if (
    [
      "under_review",
      "information_needed",
      "pickup_pending",
      "inspection_disputed",
      "exchange_pending",
      "refund_pending",
    ].includes(record.status) &&
    !(record.status === "refund_pending" && record.refundMethod === "original")
  )
    add("ask_information", "Ask for information");
  return actions;
}
export function localDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")} ${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}
export function isoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value))
    throw new Error("Use YYYY-MM-DD HH:mm for date and time.");
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime()) || localDate(date) !== value)
    throw new Error("Enter a valid date and time.");
  return date.toISOString();
}

export function inspectionItems(
  record: ReturnCase,
  quantities: Record<number, string>,
) {
  return record.items.map((item) => {
    const value = quantities[item.index]?.trim() ?? "";
    if (!/^\d+$/.test(value) || Number(value) > item.quantity)
      throw new Error(
        `Enter a sellable quantity from 0 to ${item.quantity} for ${item.name}. Use 0 for damaged or wrong items.`,
      );
    return { index: item.index, quantity: Number(value) };
  });
}
