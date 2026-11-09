import { authApi } from "../api/auth-api";
import { clearPendingLogout, setPendingLogout } from "./session-storage";
import { withCredentialLock } from "./credential-lock";
import { assertCurrentSession, getSessionScope } from "./session-scope";

let inFlight: Promise<void> | null = null;

export function logoutSession(clearLocalSession: () => void): Promise<void> {
  if (inFlight) return inFlight;
  const originalSession = getSessionScope();
  const operation = withCredentialLock(async () => {
    assertCurrentSession(originalSession);
    try {
      await setPendingLogout();
    } catch {
      console.warn("[auth] logout_marker_write_error");
    }
    assertCurrentSession(originalSession);
    clearLocalSession();
    const loggedOutSession = getSessionScope();
    await authApi.logout();
    assertCurrentSession(loggedOutSession);
    await clearPendingLogout();
  });
  inFlight = operation;
  void operation
    .finally(() => {
      if (inFlight === operation) inFlight = null;
    })
    .catch(() => undefined);
  return operation;
}
