import { apiRequest } from "../../../lib/api/client";

export const earningsApi = {
  payout: (
    storeId: string,
    body: {
      clientKey: string;
      reference: string;
      method: "upi" | "bank";
      amountPaise: number;
      transferConfirmed: true;
    },
  ) => apiRequest(`/admin/earnings/stores/${storeId}/payouts`, { body }),
  collect: (orderId: string, reference: string) =>
    apiRequest(`/admin/earnings/orders/${orderId}/collection`, {
      body: { reference, collected: true },
    }),
};
