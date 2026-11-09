export const settlementOptions = [
  {
    key: "awaiting_delivery",
    label: "Awaiting delivery",
    color: "#426185",
    bg: "#EDF2F8",
  },
  {
    key: "return_window",
    label: "24-hour hold",
    color: "#8A5A0A",
    bg: "#FFF3D9",
  },
  {
    key: "return_open",
    label: "Return / exchange hold",
    color: "#AD3770",
    bg: "#FCE8F2",
  },
  {
    key: "collection_pending",
    label: "Collection pending",
    color: "#AD4D20",
    bg: "#FFF0E6",
  },
  {
    key: "reconciliation",
    label: "Needs review",
    color: "#70469E",
    bg: "#F1E9FC",
  },
  { key: "cleared", label: "Cleared", color: "#187A53", bg: "#E3F6ED" },
  { key: "refunded", label: "Refunded", color: "#237C86", bg: "#E5F5F5" },
] as const;
export type SettlementState = (typeof settlementOptions)[number]["key"];
export type SettlementFilter = "all" | SettlementState;
export type Settlement = {
  state: SettlementState;
  releaseAt: string | null;
  holdReason: string | null;
  grossPaise: number;
  refundPaise: number;
  netPaise: number;
  eligiblePaise: number;
  commissionPaise: number;
  clearedCommissionPaise: number;
  pendingCommissionPaise: number;
  paymentVerified: boolean;
};
export type HoldGroups = Record<
  SettlementState,
  {
    orders: number;
    sellerPaise: number;
    commissionPaise: number;
    collectedPaise: number;
  }
>;
export function releaseLabel(value: string) {
  return (
    new Date(value).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }) + " IST"
  );
}
export function settlementNote(value: Settlement) {
  if (value.state === "awaiting_delivery")
    return "24-hour return window starts when the customer confirms receipt.";
  if (value.state === "return_window")
    return `Return window ends ${releaseLabel(value.releaseAt!)}. Payout and commission stay on hold.`;
  if (value.state === "return_open")
    return "On hold until the return / exchange case is resolved.";
  if (value.state === "cleared")
    return "Return window closed. Included in cleared balance; transfer is recorded separately.";
  if (value.state === "refunded")
    return "Refunded amount earns no commission or seller payout.";
  return value.holdReason ?? "";
}
