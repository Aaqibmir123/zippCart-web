import { browserLifecycle as AppState } from "../browser-lifecycle";
import { createApiError, isApiError } from "./api-error";

const isForeground = () =>
  !AppState?.currentState || AppState.currentState === "active";

export async function waitForForeground(
  signal?: AbortSignal,
  sessionSignal?: AbortSignal,
): Promise<void> {
  const signals = [signal, sessionSignal].filter(
    (value): value is AbortSignal => !!value,
  );
  if (signals.some((value) => value.aborted))
    throw createApiError("Request cancelled.", { kind: "cancelled" });
  if (isForeground()) return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      subscription.remove();
      signals.forEach((value) => value.removeEventListener("abort", cancel));
    };
    const cancel = () => {
      cleanup();
      reject(createApiError("Request cancelled.", { kind: "cancelled" }));
    };
    const subscription = AppState.addEventListener("change", () => {
      if (isForeground()) {
        cleanup();
        resolve();
      }
    });
    signals.forEach((value) =>
      value.addEventListener("abort", cancel, { once: true }),
    );
    if (signals.some((value) => value.aborted)) cancel();
    else if (isForeground()) {
      cleanup();
      resolve();
    }
  });
}

// A suspended browser connection may fail when the tab resumes. Only reads can
// be replayed here: a timed-out write may already have committed on the server.
export async function foregroundRead<T>(
  attempt: () => Promise<T>,
  signal?: AbortSignal,
  sessionSignal?: AbortSignal,
): Promise<T> {
  if (!isForeground()) await waitForForeground(signal, sessionSignal);
  let backgrounded = false;
  const subscription = AppState?.addEventListener("change", (state) => {
    if (state !== "active") backgrounded = true;
  });
  try {
    try {
      return await attempt();
    } catch (error) {
      if (
        !backgrounded ||
        !isApiError(error) ||
        !["network", "timeout"].includes(error.kind ?? "")
      )
        throw error;
      await waitForForeground(signal, sessionSignal);
      return await attempt();
    }
  } finally {
    subscription?.remove();
  }
}
