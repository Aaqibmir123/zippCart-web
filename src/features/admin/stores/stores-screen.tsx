"use client";
import Link from "next/link";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { adminStoreApi, type RequestFilter } from "./stores-api";
import { useAuth } from "../../auth/auth-provider";
import { useUrlState } from "../../../lib/hooks/use-url-state";
import {
  Badge,
  Button,
  Card,
  Heading,
  QueryState,
  Select,
} from "../../../components/ui";

export function StoresScreen() {
  const { user } = useAuth();
  const url = useUrlState();
  const status = (
    ["pending", "approved", "rejected", "all"].includes(url.get("status"))
      ? url.get("status")
      : "pending"
  ) as RequestFilter;
  const counts = useQuery({
    queryKey: ["admin-store-counts", user?.id],
    queryFn: adminStoreApi.counts,
  });
  const query = useInfiniteQuery({
    queryKey: ["admin-stores", user?.id, status],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => adminStoreApi.list(status, pageParam),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const stores = query.data?.pages.flatMap((page) => page.stores) ?? [];
  return (
    <>
      <Heading
        title="Stores"
        description="Review applications, proposed changes and approved stores."
      />
      {!user?.reviewer && (
        <Link
          prefetch={false}
          href="/admin/sellers/new"
          className="mb-6 inline-block rounded-xl bg-purple-700 px-5 py-3 text-sm font-semibold text-white"
        >
          Create Seller
        </Link>
      )}
      <div className="mb-6 max-w-sm">
        <Select
          label="Store status"
          value={status}
          onChange={(value) => url.set({ status: value })}
          options={["pending", "approved", "rejected", "all"].map((value) => ({
            value,
            label: `${value} (${counts.data?.counts[value as RequestFilter] ?? "…"})`,
          }))}
        />
      </div>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
        empty={!stores.length && query.isSuccess}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {stores.map((store) => (
          <Card key={store.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{store.storeName}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {store.storeCategory} · {store.locality}, {store.pincode}
                </p>
              </div>
              <Badge>
                {store.status === "approved" && !store.isActive
                  ? "Disabled"
                  : store.status}
              </Badge>
            </div>
            {store.changesPending && (
              <p className="mt-3 text-sm text-orange-800">
                Changes pending review
              </p>
            )}
            <Link
              prefetch={false}
              aria-label={`Review ${store.storeName}`}
              href={`/admin/stores/${store.id}`}
              className="mt-5 inline-block font-semibold text-purple-800"
            >
              View store details →
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
          Load more stores
        </Button>
      )}
    </>
  );
}
