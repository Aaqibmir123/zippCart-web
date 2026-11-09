"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../auth/auth-provider";
import { useSellerProducts, useSetSellerProductStatus } from "./use-products";
import { useProductLifecycle } from "./use-product-lifecycle";
import { useUrlState } from "../../../lib/hooks/use-url-state";
import { money } from "../../../lib/format";
import { moderationLabel } from "../../../lib/products/moderation";
import {
  Badge,
  Button,
  Card,
  Field,
  Heading,
  Notice,
  QueryState,
  Select,
} from "../../../components/ui";
import { ConfirmButton } from "../../../components/confirm-button";

export function SellerProductsScreen() {
  const { user } = useAuth();
  const url = useUrlState();
  const archived = url.get("archived") === "true";
  const filter = url.get("filter", "all");
  const search = url.get("search");
  const query = useSellerProducts(user?.id, archived);
  const lifecycle = useProductLifecycle(user?.id);
  const status = useSetSellerProductStatus(user?.id);
  const [error, setError] = useState("");
  const products = query.data?.pages.flatMap((page) => page.products) ?? [];
  const enabled = query.data?.pages[0]?.lifecycleEnabled === true;
  const readOnly = user?.reviewer === true && !user.reviewerFullAccess;
  const visible = products.filter(
    (product) =>
      (archived ||
        filter === "all" ||
        (filter === "pending"
          ? product.moderationStatus === "pending" || !product.moderationStatus
          : filter === "rejected"
            ? product.moderationStatus === "rejected"
            : filter === "listed"
              ? product.active && !!product.approvedVersion
              : !product.active)) &&
      `${product.name} ${product.category} ${product.customCategory ?? ""} ${product.brand ?? ""}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <Heading
        title={archived ? "Archived products" : "Your products"}
        description={`${query.data?.pages[0]?.total ?? 0} products in your catalogue`}
        actions={
          !readOnly && (
            <Link
              prefetch={false}
              href="/seller/products/new"
              className="rounded-xl bg-purple-700 px-4 py-3 text-sm font-semibold text-white"
            >
              Add product
            </Link>
          )
        }
      />
      <Card className="mb-6">
        <div className="grid items-end gap-4 sm:grid-cols-3">
          <Field
            label="Search your products"
            value={search}
            onChange={(event) => url.set({ search: event.target.value }, true)}
          />
          <Select
            label="Listing filter"
            value={filter}
            onChange={(value) => url.set({ filter: value })}
            options={["all", "listed", "hidden", "pending", "rejected"]}
          />
          {enabled && (
            <Select
              label="Catalogue view"
              value={String(archived)}
              onChange={(value) =>
                url.set({ archived: value === "true" ? "true" : null })
              }
              options={[
                { value: "false", label: "Current" },
                { value: "true", label: "Archived" },
              ]}
            />
          )}
        </div>
      </Card>
      {error && <Notice error>{error}</Notice>}
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
        empty={!visible.length && query.isSuccess}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {visible.map((product) => (
          <Card key={product.id}>
            <div className="flex gap-4">
              {product.coverImage && (
                <img
                  src={product.coverImage}
                  alt=""
                  loading="lazy"
                  className="h-24 w-24 rounded-xl object-cover"
                />
              )}
              <div>
                <h2 className="font-bold">{product.name}</h2>
                <p className="my-2 text-sm">
                  {product.category}
                  {product.customCategory && ` · ${product.customCategory}`}
                </p>
                <Badge>{moderationLabel(product)}</Badge>
                <p className="mt-3 text-sm">
                  {money(product.price)} · MRP {money(product.mrp)} · Stock{" "}
                  {product.stock}
                </p>
                {!!product.exchangeReserved && (
                  <p className="mt-2 text-sm">
                    {product.exchangeReserved} reserved for exchanges
                  </p>
                )}
              </div>
            </div>
            {product.rejectionReason && (
              <p className="mt-3 text-sm text-rose-800">
                {product.rejectionReason}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {!product.archivedAt && (
                <>
                  <Link
                    prefetch={false}
                    href={`/seller/products/${product.id}/edit`}
                    className="rounded-xl border border-purple-200 px-4 py-3 text-sm font-semibold text-purple-800"
                  >
                    {readOnly ? "View product" : "Edit product"}
                  </Link>
                  <Link
                    prefetch={false}
                    href={`/seller/products/${product.id}/inventory`}
                    className="rounded-xl border border-purple-200 px-4 py-3 text-sm font-semibold text-purple-800"
                  >
                    Manage stock
                  </Link>
                  {!readOnly && (
                    <Button
                      variant="secondary"
                      disabled={status.isPending || !!lifecycle.pendingId}
                      onClick={async () => {
                        setError("");
                        try {
                          await status.mutateAsync({
                            id: product.id,
                            active: !product.active,
                          });
                        } catch (cause) {
                          setError(
                            cause instanceof Error
                              ? cause.message
                              : "Could not update status.",
                          );
                        }
                      }}
                    >
                      {product.active ? "Make inactive" : "Make active"}
                    </Button>
                  )}
                </>
              )}
              {!readOnly && enabled && (
                <ConfirmButton
                  label={product.archivedAt ? "Restore product" : "Archive"}
                  title={
                    product.archivedAt ? "Restore product?" : "Archive product?"
                  }
                  message={
                    product.archivedAt
                      ? `Return ${product.name} to your catalogue with its previous listing status?`
                      : `Hide ${product.name} and move it to Archived? Existing orders and returns remain unchanged.`
                  }
                  disabled={!!lifecycle.pendingId || status.isPending}
                  onConfirm={async () => {
                    await lifecycle.run(
                      product.id,
                      product.archivedAt ? "restore" : "archive",
                    );
                  }}
                />
              )}
              {!readOnly && product.canDelete && (
                <ConfirmButton
                  label="Delete"
                  title="Delete product?"
                  danger
                  message={`Permanently remove ${product.name}? Products linked to orders or reservations cannot be deleted.`}
                  disabled={!!lifecycle.pendingId || status.isPending}
                  onConfirm={async () => {
                    await lifecycle.run(product.id, "delete");
                  }}
                />
              )}
            </div>
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
          Load more products
        </Button>
      )}
    </>
  );
}
