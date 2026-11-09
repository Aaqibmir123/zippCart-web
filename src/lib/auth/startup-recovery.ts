import { createApiError, isApiError } from "../api/api-error";

type RecoveryOptions = {
  signal: AbortSignal;
  isForeground: () => boolean;
  subscribe: (listener: () => void) => () => void;
  onWaiting: () => void;
};

// Keep credentials on transport failures; only the server can invalidate a session.
export async function recoverStartupSession<T>(
  attempt: () => Promise<T>,
  options: RecoveryOptions,
): Promise<T> {
  let failures = 0;
  const cancelled = () =>
    createApiError("Request cancelled.", { kind: "cancelled" });
  async function wait(delay: number) {
    await new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let unsubscribe = () => {};
      const due = Date.now() + delay;
      const cleanup = () => {
        clearTimeout(timer);
        unsubscribe();
        options.signal.removeEventListener("abort", abort);
      };
      const abort = () => {
        cleanup();
        reject(cancelled());
      };
      const check = () => {
        clearTimeout(timer);
        if (options.signal.aborted) {
          abort();
          return;
        }
        if (!options.isForeground()) return;
        const remaining = due - Date.now();
        if (remaining > 0) timer = setTimeout(check, remaining);
        else {
          cleanup();
          resolve();
        }
      };
      unsubscribe = options.subscribe(check);
      options.signal.addEventListener("abort", abort, { once: true });
      check();
    });
  }

  for (;;) {
    await wait(0);
    if (options.signal.aborted) throw cancelled();
    try {
      const result = await attempt();
      if (options.signal.aborted) throw cancelled();
      return result;
    } catch (error) {
      if (options.signal.aborted) throw cancelled();
      const retryable =
        isApiError(error) &&
        (error.kind === "network" ||
          error.kind === "timeout" ||
          (error.kind === "server" && (error.status ?? 0) >= 500));
      if (!retryable) throw error;
      failures++;
      if (failures >= 3) options.onWaiting();
      const retryAfter = (error.retryAfterSeconds ?? 0) * 1000;
      await wait(
        Math.max(
          failures === 1 ? 1000 : failures === 2 ? 3000 : 30000,
          retryAfter,
        ),
      );
    }
  }
}
