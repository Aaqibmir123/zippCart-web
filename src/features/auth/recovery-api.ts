import { apiRequest } from "../../lib/api/client";
export type DeliveryResult = {
  delivery: "accepted" | "failed" | "not_configured";
};
export const recoveryApi = {
  settings: () =>
    apiRequest<{
      email: string;
      verified: boolean;
      pendingEmail: string;
      deliveryAvailable: boolean;
    }>("/auth/password/settings", { method: "GET" }),
  enroll: (email: string, currentPassword: string) =>
    apiRequest<DeliveryResult>("/auth/password/recovery/email", {
      body: { email, currentPassword },
      skipAuthRefresh: true,
    }),
  request: (phone: string) =>
    apiRequest<{ message: string }>("/auth/password/recovery/request", {
      body: { phone },
      skipAuthRefresh: true,
    }),
  verify: (token: string) =>
    apiRequest<void>("/auth/password/recovery/verify", {
      body: { token },
      skipAuthRefresh: true,
    }),
  reset: (token: string, newPassword: string) =>
    apiRequest<void>("/auth/password/recovery/reset", {
      body: { token, newPassword },
      skipAuthRefresh: true,
    }),
};
export function deliveryMessage(result: DeliveryResult["delivery"]) {
  return result === "accepted"
    ? "Verification email accepted by the provider. Open the link and confirm your email before using password recovery."
    : result === "not_configured"
      ? "Email saved as unverified. Delivery is not configured; contact the administrator and resend after setup."
      : "Email saved as unverified, but the verification email could not be sent. Please try again later.";
}
