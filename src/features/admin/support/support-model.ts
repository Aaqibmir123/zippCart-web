import { ReturnCase, ReturnEvent } from "../../../lib/contracts/returns";

export const isChatMessage = (event: ReturnEvent) =>
  ["message", "reply", "submitted"].includes(event.action);

export function nextStepFor(record: ReturnCase, admin = false) {
  const steps = admin
    ? {
        under_review:
          "Review the request, then approve, reject, or ask for information.",
        information_needed:
          "Waiting for the customer to provide the requested information.",
        pickup_pending: record.addressChangeRequested
          ? "Confirm the requested address, then schedule collection."
          : "Schedule collection with the customer.",
        pickup_scheduled:
          "After the collection window, confirm pickup or record a failed attempt.",
        pickup_failed: "Arrange another collection window.",
        picked_up: "Confirm physical receipt before starting inspection.",
        inspection:
          "Record the actual inspection result and sellable quantities.",
        inspection_disputed:
          "Review the evidence, then resolve the issue or request more information.",
        refund_pending:
          record.refundMethod === "original"
            ? "Wait for the payment provider to confirm the original-payment refund; do not record manual completion."
            : "Verify the actual refund and receipt, then record its completion.",
        exchange_pending:
          "Confirm replacement stock and dispatch the replacement.",
        replacement_dispatched:
          "Wait for delivery confirmation, then record completion.",
        rejected: "No further action. The case is closed.",
        cancelled: "No further action. The case is closed.",
        refund_completed:
          "No further action. The refund is recorded as complete.",
        exchange_completed:
          "No further action. The exchange is recorded as complete.",
      }
    : {
        under_review:
          "Support is reviewing your request. Updates appear here and in Messages.",
        information_needed:
          "Action needed: reply to Support in Messages before the requested deadline.",
        pickup_pending: record.addressChangeRequested
          ? "Support must confirm your requested change and schedule collection."
          : "Your return is approved. Support will schedule collection.",
        pickup_scheduled:
          "Collection is scheduled. Be ready during the window in Details; Support records the collection result.",
        pickup_failed:
          "The collection attempt failed. Support needs to arrange another window.",
        picked_up:
          "Your parcel was collected. Support must confirm receipt before inspection.",
        inspection:
          "Your parcel is received for inspection. Support will record the outcome here.",
        inspection_disputed:
          "Action needed: review the issue and reply to Support in Messages.",
        refund_pending:
          record.refundMethod === "original"
            ? "Your original-payment refund is being handled by the payment provider. This case updates when the provider confirms it."
            : "Your refund is pending. Support will record it once the actual payment is completed.",
        exchange_pending:
          "Inspection is accepted. Support will confirm and dispatch your replacement.",
        replacement_dispatched:
          "Your replacement is dispatched. Check tracking in Details; Support confirms delivery after it is received.",
        rejected:
          "Your request was declined. The reason is in the conversation.",
        cancelled:
          "Your request was cancelled. You can still view this conversation.",
        refund_completed:
          "Your refund is complete. The recorded reference is in Details.",
        exchange_completed:
          "Your exchange is complete. You can still view this conversation.",
      };
  return steps[record.status];
}

export const eventLabels: Record<string, string> = {
  submitted: "Request submitted",
  ask_information: "More information requested",
  approve: "Return approved",
  reject: "Request declined",
  schedule: "Collection arranged",
  pickup_failed: "Collection unsuccessful",
  picked_up: "Item collected",
  received: "Item received",
  inspection_pass: "Inspection completed",
  inspection_dispute: "Inspection issue raised",
  refund_complete: "Refund completed",
  gateway_refund: "Original payment refund confirmed",
  dispatch_exchange: "Replacement dispatched",
  complete_exchange: "Exchange completed",
  payout: "Refund details updated",
  address: "Address change requested",
  reschedule: "Rescheduling requested",
  cancel: "Request cancelled",
  switch_refund: "Changed to refund",
};
