import { apiRequest } from "./client";
import { withCredentialLock } from "../auth/credential-lock";
import { assertCurrentSession, getSessionScope } from "../auth/session-scope";
import { clearPendingLogout, hasPendingLogout } from "../auth/session-storage";

export type AuthenticatedUser = {
  id: string;
  phone: string;
  createdAt: string;
  fullName?: string;
  email?: string;
  profileImage?: string | null;
  roles?: ("customer" | "seller" | "admin")[];
  storeStatus?: "none" | "pending" | "approved" | "rejected";
  isActive?: boolean;
  mode?: "customer" | "seller";
  authMethod?: "password";
  passwordChangeRequired?: boolean;
  /** Server-asserted reviewer session marker for UI affordances only. The API never trusts this field. */
  reviewer?: boolean;
  /** UI-only server marker; backend authorization uses the authenticated session. */
  reviewerFullAccess?: boolean;
};

export type OtpDelivery = {
  message: string;
  delivery: "console" | "sms" | "2factor" | "reviewer";
  expiresInSeconds: number;
  resendAfterSeconds: number;
};
export const authApi = {
  passwordLogin: async (phone: string, password: string) => {
    const session = getSessionScope();
    return withCredentialLock(async () => {
      assertCurrentSession(session);
      if (await hasPendingLogout()) {
        await authApi.logout();
        assertCurrentSession(session);
        await clearPendingLogout();
      }
      assertCurrentSession(session);
      return apiRequest<{ message: string; user: AuthenticatedUser }>(
        "/auth/password/login",
        {
          body: { phone, password },
          skipAuthRefresh: true,
          timeoutMs: 15000,
        },
      );
    });
  },
  changePassword: (currentPassword: string, newPassword: string) => {
    const session = getSessionScope();
    return withCredentialLock(() => {
      assertCurrentSession(session);
      return apiRequest<void>("/auth/password/change", {
        body: { currentPassword, newPassword },
        skipAuthRefresh: true,
        timeoutMs: 15000,
      });
    });
  },
  me: () =>
    apiRequest<{ user: AuthenticatedUser }>("/auth/me", {
      method: "GET",
      skipAuthRefresh: true,
      timeoutMs: 10000,
    }),
  refresh: () =>
    apiRequest<{ message: string; user: AuthenticatedUser }>("/auth/refresh", {
      skipAuthRefresh: true,
    }),
  logout: () => apiRequest<void>("/auth/logout", { skipAuthRefresh: true }),
};
