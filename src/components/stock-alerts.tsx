"use client";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "../features/auth/auth-provider";
import { apiRequest } from "../lib/api/client";
import { useScreenActive } from "../lib/hooks/use-page-active";
import { Button, Card, QueryState } from "./ui";
type StockAlert = {
  productId: string;
  productName: string;
  storeId: string;
  color: string;
  size: string;
  stock: number;
  outOfStock: boolean;
};
export function StockAlerts({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const active = useScreenActive();
  const [visible, setVisible] = useState(5);
  const query = useInfiniteQuery({
    queryKey: ["inventory-alerts", user?.id, admin],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiRequest<{ alerts: StockAlert[]; nextPage: number | null }>(
        `${admin ? "/admin/stock-alerts" : "/seller/inventory/alerts"}?page=${pageParam}`,
        { method: "GET" },
      ),
    getNextPageParam: (last) => last.nextPage ?? undefined,
    enabled: active && !!user,
    refetchInterval: active ? 30000 : false,
  });
  const alerts = query.data?.pages.flatMap((page) => page.alerts) ?? [];
  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold">Stock alerts</h2>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
        empty={query.isSuccess && !alerts.length}
      />
      {alerts.slice(0, visible).map((alert) => (
        <p
          key={JSON.stringify([alert.productId, alert.color, alert.size])}
          className={`py-2 text-sm ${alert.outOfStock ? "text-rose-800" : "text-slate-700"}`}
        >
          {alert.productName} ·{" "}
          {[alert.color, alert.size].filter(Boolean).join(" / ")} ·{" "}
          {alert.outOfStock ? "Out of stock" : `${alert.stock} left`}
        </p>
      ))}
      {(visible < alerts.length || query.hasNextPage) && (
        <Button
          className="mt-4"
          variant="secondary"
          disabled={query.isFetchingNextPage}
          onClick={() => {
            setVisible(visible + 20);
            if (visible >= alerts.length) void query.fetchNextPage();
          }}
        >
          Show more stock alerts
        </Button>
      )}
    </Card>
  );
}
