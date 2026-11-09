"use client";
import { usePathname, useSearchParams } from "next/navigation";

/** Shareable filters and normal browser Back/Forward, without remounting layouts. */
export function useUrlState() {
  const pathname = usePathname();
  const params = useSearchParams();
  return {
    get: (key: string, fallback = "") => params.get(key) ?? fallback,
    set(values: Record<string, string | number | null>, replace = false) {
      // Next integrates the native History API with useSearchParams. Read the
      // latest URL so quick filter changes cannot overwrite a pending update.
      const next = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(values)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      const target = `${pathname}${next.size ? `?${next}` : ""}`;
      if (replace) window.history.replaceState(null, "", target);
      else window.history.pushState(null, "", target);
    },
  };
}
