"use client";
import { useEffect, useState, type PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./auth-provider";
import { createQueryClient } from "../../lib/query-client";
import { startLogoutRecovery } from "../../lib/auth/logout-recovery";
import { browserLifecycle } from "../../lib/browser-lifecycle";

function SessionRecovery() {
  const { user, retrySessionRestore } = useAuth();
  useEffect(() => {
    if (user) return;
    return startLogoutRecovery({
      isForeground: () => browserLifecycle.currentState === "active",
      subscribe: (listener) => {
        const subscription = browserLifecycle.addEventListener(
          "change",
          listener,
        );
        return () => subscription.remove();
      },
    });
  }, [user]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (
        [
          "zippcart.web.zippcart.auth.sessionMayExist.v1",
          "zippcart.web.zippcart.auth.logoutPending.v1",
        ].includes(event.key ?? "")
      )
        retrySessionRestore();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [retrySessionRestore]);
  return null;
}
export function Providers({ children }: PropsWithChildren) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <SessionRecovery />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
