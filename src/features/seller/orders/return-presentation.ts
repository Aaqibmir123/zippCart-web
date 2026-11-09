import { ReturnStatus } from "../../../lib/contracts/returns";

type ReturnPreference = "refund" | "exchange";
type ReturnPresentation = { title: string; next: string };

const stages: Record<ReturnStatus, ReturnPresentation> = {
  under_review: {
    title: "requested · Under review",
    next: "Admin is reviewing the request and will update its outcome.",
  },
  information_needed: {
    title: "More information needed",
    next: "The customer has been asked to reply to Admin.",
  },
  pickup_pending: {
    title: "approved · Pickup pending",
    next: "Admin will arrange collection before recording pickup.",
  },
  pickup_scheduled: {
    title: "Collection scheduled",
    next: "Collection is arranged; Admin must record when the parcel is picked up.",
  },
  pickup_failed: {
    title: "Collection failed · Rescheduling needed",
    next: "Admin needs to arrange another collection attempt.",
  },
  picked_up: {
    title: "Parcel picked up",
    next: "Pickup is recorded; the next step is Admin confirming receipt for inspection.",
  },
  inspection: {
    title: "Item received for inspection",
    next: "Receipt is recorded; Admin will record the inspection outcome.",
  },
  inspection_disputed: {
    title: "Inspection issue",
    next: "Admin recorded an inspection issue; the case needs resolution.",
  },
  refund_pending: {
    title: "Refund pending",
    next: "Refund completion has not yet been recorded.",
  },
  exchange_pending: {
    title: "Replacement pending",
    next: "Admin will confirm replacement stock and record dispatch.",
  },
  replacement_dispatched: {
    title: "Replacement dispatched",
    next: "Dispatch is recorded; Admin must confirm replacement delivery.",
  },
  refund_completed: {
    title: "Refund completed",
    next: "Admin or the payment gateway recorded refund completion.",
  },
  exchange_completed: {
    title: "Exchange completed",
    next: "Admin recorded replacement delivery.",
  },
  rejected: {
    title: "request rejected",
    next: "The request is closed; no further return action is pending.",
  },
  cancelled: {
    title: "request cancelled",
    next: "The request is closed; no further return action is pending.",
  },
};

export function sellerReturnPresentation(
  status: ReturnStatus,
  preference: ReturnPreference,
): ReturnPresentation {
  const stage = stages[status];
  if (status === "under_review" || status === "pickup_pending") {
    return {
      ...stage,
      title: `${preference === "exchange" ? "Exchange" : "Return"} ${stage.title}`,
    };
  }
  if (status === "rejected" || status === "cancelled") {
    return {
      ...stage,
      title: `${preference === "exchange" ? "Exchange" : "Return"} ${stage.title}`,
    };
  }
  return stage;
}

export function sellerLegacyReturnPresentation(
  status: string,
  preference: ReturnPreference | null,
): ReturnPresentation {
  if (status === "return_approved") {
    return {
      title: "Return approved · Needs reconciliation",
      next: "This earlier request has no recorded collection or inspection workflow.",
    };
  }
  if (status === "return_rejected") {
    return { title: "Return rejected", next: "The earlier request is closed." };
  }
  if (status === "return_completed") {
    return {
      title: "Earlier request marked complete · Needs reconciliation",
      next: "The legacy record does not verify refund payment or inventory changes.",
    };
  }
  return {
    title: `${preference === "exchange" ? "Exchange" : "Return"} requested · Needs reconciliation`,
    next: "This earlier order-level request has no item-level collection or inspection status.",
  };
}
