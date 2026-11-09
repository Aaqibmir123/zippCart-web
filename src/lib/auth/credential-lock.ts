import { withBrowserLock } from "./browser-lock";
let pending: Promise<unknown> = Promise.resolve();

// Include persistent logout-marker operations in the same ordering as login.
export function withCredentialLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(() => withBrowserLock("credentials", operation));
  pending = result.catch(() => undefined);
  return result;
}
