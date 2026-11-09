"use client";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/auth-provider";
import { apiRequest } from "../../lib/api/client";
import { useScreenActive } from "../../lib/hooks/use-page-active";
import { Button, Card, Heading, Notice, QueryState } from "../../components/ui";
type Notification = {
  id: string;
  title: string;
  body: string;
  orderId: string;
  createdAt: string;
};
export function NotificationsScreen({ role }: { role: "admin" | "seller" }) {
  const { user } = useAuth();
  const active = useScreenActive();
  const query = useInfiniteQuery({
    queryKey: ["notification-inbox", user?.id],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      apiRequest<{
        notifications: Notification[];
        page: number;
        hasMore: boolean;
      }>(`/notifications/inbox?page=${pageParam}&limit=20`, {
        method: "GET",
        signal,
      }),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: active && !!user && !user.reviewer,
    refetchInterval: active ? 30000 : false,
  });
  const records = [
    ...new Map(
      (query.data?.pages.flatMap((page) => page.notifications) ?? []).map(
        (record) => [record.id, record],
      ),
    ).values(),
  ];
  return (
    <>
      <Heading
        title="Notifications"
        description="Order updates for your existing account. Browser push is unavailable with the current backend."
        actions={
          <Button
            variant="secondary"
            onClick={() => void query.refetch()}
            disabled={!!user?.reviewer}
          >
            Refresh inbox
          </Button>
        }
      />
      {user?.reviewer ? (
        <Notice>
          Production notifications are unavailable in reviewer mode.
        </Notice>
      ) : (
        <>
          <QueryState
            pending={query.isPending}
            error={query.error}
            retry={() => void query.refetch()}
            empty={query.isSuccess && !records.length}
          />
          <div className="space-y-4">
            {records.map((record) => (
              <Card key={record.id}>
                <h2 className="font-bold">{record.title}</h2>
                <p className="my-3 text-sm leading-7">{record.body}</p>
                <p className="text-xs text-slate-500">
                  {new Date(record.createdAt).toLocaleString("en-IN")}
                </p>
                {/^[a-f\d]{24}$/i.test(record.orderId) && (
                  <Link
                    prefetch={false}
                    aria-label={`View order: ${record.title}`}
                    href={
                      role === "admin"
                        ? `/admin/shipping/${record.orderId}`
                        : `/seller/orders/${record.orderId}`
                    }
                    className="mt-4 inline-block font-semibold text-purple-800"
                  >
                    View order →
                  </Link>
                )}
              </Card>
            ))}
          </div>
          {query.hasNextPage && (
            <Button
              className="mt-5"
              variant="secondary"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              Load more notifications
            </Button>
          )}
        </>
      )}
    </>
  );
}
