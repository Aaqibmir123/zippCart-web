/** Browser lifecycle used by session recovery and read-only request retries. */
export const browserLifecycle = {
  get currentState() {
    return typeof document === "undefined" ||
      document.visibilityState !== "hidden"
      ? "active"
      : "background";
  },
  addEventListener(_event: string, listener: (state: string) => void) {
    const notify = () => listener(browserLifecycle.currentState);
    document.addEventListener("visibilitychange", notify);
    window.addEventListener("online", notify);
    return {
      remove() {
        document.removeEventListener("visibilitychange", notify);
        window.removeEventListener("online", notify);
      },
    };
  },
};
