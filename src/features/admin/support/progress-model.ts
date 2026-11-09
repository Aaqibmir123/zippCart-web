import type { ReturnCase } from "../../../lib/contracts/returns";
import { statusLabels } from "../../../lib/contracts/returns";
type Milestone = {
  label: string;
  actions: string[];
  reached?: (record: ReturnCase) => boolean;
};

const commonMilestones: Milestone[] = [
  { label: "Request submitted", actions: ["submitted"] },
  { label: "Admin approved", actions: ["approve"] },
  { label: "Collection scheduled", actions: ["schedule"] },
  { label: "Parcel picked up", actions: ["picked_up"] },
  { label: "Parcel received for inspection", actions: ["received"] },
  { label: "Inspection accepted", actions: ["inspection_pass"] },
];

export function milestonesFor(record: ReturnCase): Milestone[] {
  const outcome: Milestone[] =
    record.preference === "refund"
      ? [
          {
            label: "Refund pending",
            actions: [],
            reached: (item) =>
              ["refund_pending", "refund_completed"].includes(item.status) ||
              (item.status === "information_needed" &&
                item.resumeStatus === "refund_pending"),
          },
          {
            label: "Refund completed",
            actions: ["refund_complete", "gateway_refund"],
            reached: (item) => item.status === "refund_completed",
          },
        ]
      : [
          {
            label: "Replacement pending",
            actions: [],
            reached: (item) =>
              [
                "exchange_pending",
                "replacement_dispatched",
                "exchange_completed",
              ].includes(item.status) ||
              (item.status === "information_needed" &&
                item.resumeStatus === "exchange_pending"),
          },
          {
            label: "Replacement dispatched",
            actions: ["dispatch_exchange"],
            reached: (item) =>
              ["replacement_dispatched", "exchange_completed"].includes(
                item.status,
              ),
          },
          {
            label: "Exchange completed",
            actions: ["complete_exchange"],
            reached: (item) => item.status === "exchange_completed",
          },
        ];
  return [...commonMilestones, ...outcome];
}

function actionFor(record: ReturnCase, actions: string[]) {
  return [...record.history]
    .reverse()
    .find((event) => actions.includes(event.action));
}

export function completed(record: ReturnCase, milestone: Milestone) {
  return (
    !!actionFor(record, milestone.actions) || !!milestone.reached?.(record)
  );
}

export function milestoneTime(record: ReturnCase, milestone: Milestone) {
  const event = actionFor(record, milestone.actions);
  if (event) return new Date(event.at).toLocaleString("en-IN");
  if (milestone.reached?.(record))
    return new Date(record.updatedAt).toLocaleString("en-IN");
  return null;
}

export function currentStatus(record: ReturnCase) {
  const subject = record.preference === "exchange" ? "Exchange" : "Return";
  if (record.status === "under_review")
    return "Request submitted · Under review";
  if (record.status === "pickup_pending")
    return "Admin approved · Pickup pending";
  if (record.status === "inspection") return "Parcel received · Inspection";
  if (record.status === "pickup_failed")
    return "Collection failed · Rescheduling needed";
  if (record.status === "rejected") return `${subject} rejected`;
  if (record.status === "cancelled") return `${subject} cancelled`;
  return statusLabels[record.status];
}
