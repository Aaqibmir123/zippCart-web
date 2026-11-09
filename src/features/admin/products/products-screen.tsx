"use client";
import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { productReviewApi, type ReviewFilter } from "./products-api";
import { adminStoreApi } from "../stores/stores-api";
import { useAuth } from "../../auth/auth-provider";
import { useUrlState } from "../../../lib/hooks/use-url-state";
import { money } from "../../../lib/format";
import {
  Badge,
  Button,
  Card,
  Field,
  Heading,
  QueryState,
  Select,
} from "../../../components/ui";

export function ProductsScreen() {
  const url = useUrlState();
  const { user } = useAuth();
  const status = url.get("status", "pending") as ReviewFilter;
  const search = url.get("search");
  const storeId = url.get("storeId");
  const [draft, setDraft] = useState(search);
  const [showStores, setShowStores] = useState(false);
  const query = useInfiniteQuery({
    queryKey: ["admin-products", user?.id, status, search, storeId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      productReviewApi.list(status, search, storeId, pageParam),
    getNextPageParam: (last) => last.nextPage ?? undefined,
    retry: false,
  });
  const stores = useInfiniteQuery({
    queryKey: ["admin-product-store-filter", user?.id],
    enabled: showStores,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => adminStoreApi.list("all", pageParam),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const products = query.data?.pages.flatMap((page) => page.products) ?? [];
  return (
    <>
      <Heading
        title="Product approvals"
        description="Review submitted changes while approved product content stays live."
      />
      <Card className="mb-6">
        <div className="grid items-end gap-4 sm:grid-cols-3">
          <Select
            label="Moderation status"
            value={status}
            onChange={(value) => url.set({ status: value })}
            options={["pending", "approved", "rejected", "legacy", "all"]}
          />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              url.set({ search: draft.trim() });
            }}
            className="flex items-end gap-2"
          >
            <Field
              label="Search submissions"
              maxLength={100}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button type="submit">Search</Button>
          </form>
          <Button
            variant="secondary"
            onClick={() => setShowStores(!showStores)}
          >
            {storeId ? "Change seller filter" : "Filter by seller"}
          </Button>
        </div>
        {showStores && (
          <div className="mt-5 space-y-3">
            <Button
              variant="secondary"
              onClick={() => {
                url.set({ storeId: null });
                setShowStores(false);
              }}
            >
              All sellers
            </Button>
            <QueryState
              pending={stores.isPending}
              error={stores.error}
              retry={() => void stores.refetch()}
            />
            {stores.data?.pages
              .flatMap((page) => page.stores)
              .map((store) => (
                <Button
                  key={store.id}
                  variant="secondary"
                  onClick={() => {
                    url.set({ storeId: store.id });
                    setShowStores(false);
                  }}
                >
                  {store.storeName}
                </Button>
              ))}
            {stores.hasNextPage && (
              <Button
                variant="secondary"
                onClick={() => void stores.fetchNextPage()}
              >
                Load more sellers
              </Button>
            )}
          </div>
        )}
      </Card>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
        empty={!products.length && query.isSuccess}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {products.map((product) => (
          <Card key={product.id}>
            <div className="flex gap-4">
              {product.coverImage && (
                <img
                  src={product.coverImage}
                  alt=""
                  loading="lazy"
                  className="h-20 w-20 rounded-xl object-cover"
                />
              )}
              <div>
                <h2 className="font-bold">{product.name}</h2>
                <p className="mt-2 text-sm">
                  {product.storeName} · {product.category}
                  {product.customCategory && ` · ${product.customCategory}`}
                </p>
                <p className="my-2 text-sm">
                  {money(product.price)} · MRP {money(product.mrp)}
                </p>
                <Badge>
                  {product.approvedVersion ? "Product update" : "New product"} ·{" "}
                  {product.moderationStatus ?? "legacy"}
                </Badge>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {product.submittedAt
                ? new Date(product.submittedAt).toLocaleString("en-IN")
                : "Not yet submitted"}
            </p>
            <Link
              prefetch={false}
              href={`/admin/products/${product.id}`}
              aria-label={`Review ${product.name}`}
              className="mt-4 inline-block font-semibold text-purple-800"
            >
              Review submission →
            </Link>
          </Card>
        ))}
      </div>
      {query.hasNextPage && (
        <Button
          className="mt-6"
          disabled={query.isFetchingNextPage}
          variant="secondary"
          onClick={() => void query.fetchNextPage()}
        >
          Load more products
        </Button>
      )}
    </>
  );
}
