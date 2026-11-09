import { isApiError } from "../api/api-error";
import { getSessionScope, isCurrentSession } from "./session-scope";
import { retryPendingLogout } from "./pending-logout";

type Lifecycle = {
  isForeground: () => boolean;
  subscribe: (listener: () => void) => () => void;
};

export function startLogoutRecovery(lifecycle: Lifecycle): () => void {
  const session = getSessionScope();
  let active = true,
    busy = false,
    attempts = 0;
  let lastAttempt = -Infinity;
  let retryNotBefore = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const canRun = () =>
    active &&
    !session.userId &&
    isCurrentSession(session) &&
    lifecycle.isForeground();
  const schedule = (delay: number) => {
    clearTimeout(timer);
    if (canRun())
      timer = setTimeout(() => {
        void run();
      }, delay);
  };
  async function run() {
    if (!canRun() || busy) return;
    const remaining = Math.max(lastAttempt + 5000, retryNotBefore) - Date.now();
    if (remaining > 0) {
      schedule(remaining);
      return;
    }
    clearTimeout(timer);
    busy = true;
    lastAttempt = Date.now();
    try {
      await retryPendingLogout();
      attempts = 0;
    } catch (error) {
      if (
        isApiError(error) &&
        (error.kind === "cancelled" ||
          (error.status && error.status < 500 && error.status !== 429))
      )
        return;
      const delays = [5000, 15000, 60000, 300000];
      const retryAfter = isApiError(error)
        ? (error.retryAfterSeconds ?? 0) * 1000
        : 0;
      retryNotBefore = Date.now() + retryAfter;
      schedule(
        Math.max(delays[Math.min(attempts++, delays.length - 1)], retryAfter),
      );
    } finally {
      busy = false;
    }
  }
  const unsubscribe = lifecycle.subscribe(() => {
    if (lifecycle.isForeground()) void run();
    else clearTimeout(timer);
  });
  void run();
  return () => {
    active = false;
    clearTimeout(timer);
    unsubscribe();
  };
}
