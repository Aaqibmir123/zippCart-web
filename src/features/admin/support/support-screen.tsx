"use client";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { useUrlState } from "../../../lib/hooks/use-url-state";
import { useScreenActive } from "../../../lib/hooks/use-page-active";
import { statusLabels } from "../../../lib/contracts/returns";
import { money } from "../../../lib/format";
import { supportApi } from "./support-api";
import {
  Badge,
  Button,
  Card,
  Heading,
  Notice,
  QueryState,
} from "../../../components/ui";
export function SupportScreen() {
  const { user } = useAuth();
  const url = useUrlState();
  const status = url.get("status", "open");
  const active = useScreenActive();
  const query = useInfiniteQuery({
    queryKey: ["return-admin", user?.id, status],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => supportApi.list(status, pageParam),
    getNextPageParam: (last) => last.nextPage ?? undefined,
    enabled: active && !user?.reviewer,
    refetchInterval: active ? 30000 : false,
  });
  const cases = query.data?.pages.flatMap((page) => page.cases) ?? [];
  return (
    <>
      <Heading
        title="Support requests"
        description="Return and exchange conversations, actions and saved history."
      />
      <nav aria-label="Support views" className="mb-5 flex flex-wrap gap-3">
        <Button
          variant={status === "open" ? "primary" : "secondary"}
          onClick={() => url.set({ status: "open" })}
        >
          Active
        </Button>
        <Button
          variant={status === "closed" ? "primary" : "secondary"}
          onClick={() => url.set({ status: "closed" })}
        >
          History
        </Button>
        <Link
          prefetch={false}
          href="/admin/support/earlier"
          className="rounded-xl border border-purple-200 px-4 py-3 text-sm font-semibold text-purple-800"
        >
          Earlier requests
        </Link>
      </nav>
      {user?.reviewer ? (
        <Notice>
          Production support records are unavailable to reviewer sessions.
        </Notice>
      ) : (
        <>
          <QueryState
            pending={query.isPending}
            error={query.error}
            retry={() => void query.refetch()}
            empty={query.isSuccess && !cases.length}
          />
          <div className="grid gap-5 lg:grid-cols-2">
            {cases.map((record) => (
              <Card key={record.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <h2 className="font-bold">{record.customer}</h2>
                  <Badge>{statusLabels[record.status]}</Badge>
                </div>
                <p className="mt-3 text-sm">
                  {record.itemName} · {record.preference} ·{" "}
                  {money(record.amount)}
                </p>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                  {record.lastMessage}
                </p>
                <p className="mt-3 text-xs">
                  {record.requestId} ·{" "}
                  {new Date(
                    record.updatedAt ?? record.createdAt,
                  ).toLocaleString("en-IN")}
                </p>
                <Link
                  prefetch={false}
                  href={`/admin/support/${record.orderId}/${record.id}`}
                  className="mt-5 inline-block font-semibold text-purple-800"
                >
                  {record.unread ? "New message · " : ""}Open request →
                </Link>
              </Card>
            ))}
          </div>
          {query.hasNextPage && (
            <Button
              className="mt-6"
              variant="secondary"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              Load more requests
            </Button>
          )}
        </>
      )}
    </>
  );
}
