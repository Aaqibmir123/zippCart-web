import { apiRequest } from "../api/client";
import {
  assertCurrentSession,
  getSessionScope,
  type SessionScope,
} from "./session-scope";
import { clearPendingLogout, hasPendingLogout } from "./session-storage";
import { withCredentialLock } from "./credential-lock";

let inFlight: { session: SessionScope; promise: Promise<void> } | null = null;

export function retryPendingLogout(): Promise<void> {
  const session = getSessionScope();
  if (session.userId) return Promise.resolve();
  if (inFlight?.session === session) return inFlight.promise;
  const promise = withCredentialLock(async () => {
    assertCurrentSession(session);
    const pending = await hasPendingLogout();
    assertCurrentSession(session);
    if (!pending) return;
    // Never refresh A's cookies. New OTP login holds the same credential lock.
    await apiRequest<void>("/auth/logout", { skipAuthRefresh: true });
    assertCurrentSession(session);
    await clearPendingLogout();
  });
  inFlight = { session, promise };
  void promise
    .finally(() => {
      if (inFlight?.promise === promise) inFlight = null;
    })
    .catch(() => undefined);
  return promise;
}
