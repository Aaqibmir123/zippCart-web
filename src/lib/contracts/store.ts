export type StoreSummary = {
  id: string;
  storeName: string;
  storeCategory: string;
  locality: string;
  pincode: string;
  payoutMethod: "upi" | "bank" | null;
  status: "none" | "pending" | "approved" | "rejected";
  isActive: boolean;
  isOpen: boolean;
  createdAt: string;
  changesPending?: boolean;
  applicationRevision?: number;
  reviewNote?: string;
};
export type StoreDetails = StoreSummary & {
  ownerFullName: string;
  mobileNumber: string;
  fullAddress: string;
  payout:
    | { method: "upi"; upiId: string }
    | {
        method: "bank";
        accountHolder: string;
        accountNumber: string;
        ifsc: string;
      };
  documents: string[];
  reviewHistory: { action: string; at: string; note?: string }[];
};
