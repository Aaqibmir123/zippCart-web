import { useEffect, useState } from "react";
import { useScreenActive } from "./use-page-active";

export function useCountdown(deadline: number, enabled = true) {
  const active = useScreenActive(enabled);
  const [seconds, setSeconds] = useState(() =>
    Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
  );
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function update() {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining > 0)
        timer = setTimeout(
          update,
          Math.min(1000, Math.max(1, deadline - Date.now())),
        );
    }
    update();
    return () => clearTimeout(timer);
  }, [active, deadline]);
  return seconds;
}
