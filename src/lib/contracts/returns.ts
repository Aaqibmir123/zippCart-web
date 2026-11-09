import { AddressInput } from "./order";

export type ReturnStatus =
  | "under_review"
  | "information_needed"
  | "pickup_pending"
  | "pickup_scheduled"
  | "pickup_failed"
  | "picked_up"
  | "inspection"
  | "inspection_disputed"
  | "refund_pending"
  | "exchange_pending"
  | "replacement_dispatched"
  | "rejected"
  | "cancelled"
  | "refund_completed"
  | "exchange_completed";
export type ReturnReason =
  | "damaged"
  | "wrong_item"
  | "not_as_described"
  | "size_fit"
  | "other";
export type RefundMethod = "upi" | "bank" | "cash";
export type RefundPayout =
  | { method: "upi"; upiId: string }
  | {
      method: "bank";
      accountHolder: string;
      accountNumber: string;
      ifsc: string;
    }
  | { method: "cash" };
export type Pickup = {
  mode: "pickup" | "dropoff";
  start: string;
  end: string;
  contact: string;
  reference: string;
  instructions: string;
};
export type ReturnItem = {
  index: number;
  productId: string;
  name: string;
  color: string;
  size: string;
  price: number;
  quantity: number;
  exchangeColor: string;
  exchangeSize: string;
};
export type ReturnEvent = {
  id: string;
  action: string;
  actor: "customer" | "admin";
  at: string;
  note: string;
  photoIds: string[];
  status: ReturnStatus;
  address?: AddressInput;
  schedule?: Pickup;
};
export type ReturnCase = {
  id: string;
  orderId: string;
  requestId: string;
  status: ReturnStatus;
  preference: "refund" | "exchange";
  reason: ReturnReason;
  description: string;
  items: ReturnItem[];
  photoIds: string[];
  pickupAddress: AddressInput;
  proposedAddress?: AddressInput;
  addressChangeRequested?: boolean;
  refundMethod?: RefundMethod | "original";
  amount: number;
  reference?: string;
  pickup?: Pickup;
  replacement?: { reference: string; carrier: string; dispatchedAt: string };
  inventory?: {
    replacement?: "reserved" | "released" | "dispatched";
    inspectedAt?: string;
    restockItems: { index: number; quantity: number }[];
  };
  resumeStatus?: ReturnStatus;
  proofDueAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  history: ReturnEvent[];
  payoutSummary?: string;
  unread?: boolean;
};
export type ReturnSummary = Pick<
  ReturnCase,
  | "id"
  | "orderId"
  | "requestId"
  | "status"
  | "preference"
  | "createdAt"
  | "amount"
> & {
  customer: string;
  itemName?: string;
  lastMessage?: string;
  unread?: boolean;
  updatedAt?: string;
};
export type ReturnRequest = {
  clientKey: string;
  preference: "refund" | "exchange";
  reason: ReturnReason;
  description: string;
  items: Pick<
    ReturnItem,
    "index" | "quantity" | "exchangeColor" | "exchangeSize"
  >[];
  photoIds: string[];
  pickupAddress: AddressInput;
  refundMethod?: RefundMethod | "original";
  payout?: RefundPayout;
};
type Versioned = { version: number; clientKey: string; note: string };
export type CustomerAction = Versioned &
  (
    | { action: "message"; photoIds: string[] }
    | { action: "payout"; payout: RefundPayout }
    | { action: "reply"; photoIds: string[]; pickupAddress?: AddressInput }
    | { action: "address"; pickupAddress: AddressInput }
    | { action: "reschedule"; pickupAddress?: AddressInput }
    | { action: "cancel" }
    | {
        action: "switch_refund";
        refundMethod: RefundMethod;
        payout: RefundPayout;
      }
    | { action: "switch_refund"; refundMethod: "original" }
  );
export type AdminAction = Versioned &
  (
    | { action: "message"; photoIds: string[] }
    | { action: "ask_information"; dueAt: string }
    | {
        action:
          | "approve"
          | "reject"
          | "pickup_failed"
          | "picked_up"
          | "received"
          | "complete_exchange";
      }
    | { action: "schedule"; pickup: Pickup; acceptAddressChange: boolean }
    | {
        action: "inspection_pass";
        receivedQuantity: number;
        restockItems: { index: number; quantity: number }[];
      }
    | { action: "inspection_dispute"; photoIds: string[] }
    | {
        action: "refund_complete";
        amount: number;
        reference: string;
        method: RefundMethod;
        paymentVerified: true;
      }
    | {
        action: "dispatch_exchange";
        reference: string;
        carrier: string;
        stockConfirmed: true;
      }
  );
export const statusLabels: Record<ReturnStatus, string> = {
  under_review: "Under review",
  information_needed: "More information needed",
  pickup_pending: "Pickup pending",
  pickup_scheduled: "Collection scheduled",
  pickup_failed: "Pickup needs rescheduling",
  picked_up: "Picked up",
  inspection: "Item received · Inspection",
  inspection_disputed: "Inspection issue",
  refund_pending: "Refund pending",
  exchange_pending: "Replacement pending",
  replacement_dispatched: "Replacement dispatched",
  rejected: "Rejected",
  cancelled: "Cancelled",
  refund_completed: "Refund completed",
  exchange_completed: "Exchange completed",
};
export const reasonLabels: Record<ReturnReason, string> = {
  damaged: "Damaged or defective",
  wrong_item: "Wrong item received",
  not_as_described: "Not as described",
  size_fit: "Size or fit issue",
  other: "Other",
};
export const closedStatuses: ReturnStatus[] = [
  "rejected",
  "cancelled",
  "refund_completed",
  "exchange_completed",
];
export const editableAddressStatuses: ReturnStatus[] = [
  "under_review",
  "information_needed",
  "pickup_pending",
  "pickup_failed",
];
export const requestKey = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
