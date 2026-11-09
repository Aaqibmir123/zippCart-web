"use client";
import type { PropsWithChildren } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SessionBoundary } from "../../auth/session-boundary";
import { useAuth } from "../../auth/auth-provider";
import { SellerAccess, useSellerSession } from "../session/seller-access";
import { storeApi, storeQueryKey } from "../store/store-api";
import { SellerSidebar } from "./seller-sidebar";

function SellerShell({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const application = usePathname().startsWith("/seller/application");
  const session = useSellerSession();
  // Share the existing query keys with onboarding; no separate identity source.
  const registration = useQuery({
    queryKey: storeQueryKey(user?.id),
    queryFn: storeApi.get,
    enabled: application,
  });
  const invitation = useQuery({
    queryKey: ["seller-invitation", user?.id],
    queryFn: storeApi.invitation,
    enabled:
      application &&
      registration.isSuccess &&
      !registration.data.store &&
      user?.authMethod === "password",
    gcTime: 0,
    retry: false,
  });
  const store = application ? registration.data?.store : session.data?.store;
  const invited = application ? invitation.data?.invitation : null;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <SellerSidebar
        application={application}
        storeName={store?.storeName ?? invited?.storeName}
        category={store?.storeCategory ?? invited?.storeCategory}
      />
      <main className="min-w-0 p-4 sm:p-7 lg:p-9">
        <div className="mx-auto max-w-7xl">
          <SellerAccess>{children}</SellerAccess>
        </div>
      </main>
    </div>
  );
}

export function SellerWorkspace({ children }: PropsWithChildren) {
  return (
    <SessionBoundary role="seller">
      <SellerShell>{children}</SellerShell>
    </SessionBoundary>
  );
}
