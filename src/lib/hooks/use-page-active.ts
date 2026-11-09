import { useSyncExternalStore } from "react";
const subscribe = (notify: () => void) => {
  document.addEventListener("visibilitychange", notify);
  return () => document.removeEventListener("visibilitychange", notify);
};
export function useScreenActive(enabled = true) {
  return useSyncExternalStore(
    subscribe,
    () => enabled && document.visibilityState !== "hidden",
    () => false,
  );
}
