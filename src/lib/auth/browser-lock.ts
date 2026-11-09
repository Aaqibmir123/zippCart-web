// Web Locks serialize cookie/credential writes across tabs on supported browsers.
// The caller also keeps an in-tab queue for browsers without Web Locks.
export async function withBrowserLock<T>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return await navigator.locks.request(`zippcart:${name}`, operation);
  }
  return operation();
}
