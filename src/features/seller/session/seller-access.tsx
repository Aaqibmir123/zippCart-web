"use client";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { apiRequest } from "../../../lib/api/client";
import type { StoreSummary } from "../../../lib/contracts/store";
import { useScreenActive } from "../../../lib/hooks/use-page-active";
import { isApiError } from "../../../lib/api/api-error";
import { QueryState } from "../../../components/ui";
export function useSellerSession() {
  const { user } = useAuth();
  const pathname = usePathname();
  const active = useScreenActive();
  return useQuery({
    queryKey: ["seller-session", user?.id],
    queryFn: () =>
      apiRequest<{ store: StoreSummary }>("/seller/session", { method: "GET" }),
    enabled: active && !!user && !pathname.startsWith("/seller/application"),
    retry: false,
    refetchInterval: active ? 30000 : false,
  });
}
export function SellerAccess({ children }: PropsWithChildren) {
  const query = useSellerSession();
  const pathname = usePathname();
  if (pathname.startsWith("/seller/application")) return children;
  const temporary =
    isApiError(query.error) &&
    ["network", "timeout", "server"].includes(query.error.kind ?? "");
  if (query.data && (!query.isError || temporary)) return children;
  return (
    <QueryState
      pending={query.isPending}
      error={query.error}
      retry={() => void query.refetch()}
    />
  );
}
