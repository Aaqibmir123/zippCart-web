"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SellerProduct } from "../../../lib/contracts/product";
import { useAuth } from "../../auth/auth-provider";
import { useSellerProduct, useSetSellerInventory } from "./use-products";
import {
  Button,
  Card,
  Field,
  Heading,
  Notice,
  QueryState,
} from "../../../components/ui";

function InventoryForm({ product }: { product: SellerProduct }) {
  const { user } = useAuth();
  const router = useRouter();
  const [original] = useState(product);
  const live = original.liveInventory ?? original.publicVersion ?? original;
  const [quantities, setQuantities] = useState(
    live.variantStock?.length
      ? live.variantStock.map((variant) => String(variant.stock))
      : [String(live.stock)],
  );
  const [error, setError] = useState("");
  const lock = useRef(false);
  const mutation = useSetSellerInventory(user?.id);
  const readOnly = user?.reviewer === true && !user.reviewerFullAccess;
  async function save() {
    if (lock.current || readOnly) return;
    if (
      quantities.some(
        (value) => !/^\d+$/.test(value) || Number(value) > 1000000,
      ) ||
      quantities.reduce((sum, value) => sum + Number(value), 0) > 1000000
    ) {
      setError("Enter whole quantities with total stock from 0 to 1,000,000.");
      return;
    }
    lock.current = true;
    setError("");
    try {
      await mutation.mutateAsync({
        id: original.id,
        input: {
          stock: quantities.reduce((sum, value) => sum + Number(value), 0),
          variantStock: (live.variantStock ?? []).map((variant, index) => ({
            ...variant,
            stock: Number(quantities[index]),
          })),
          expectedInventoryRevision: original.inventoryRevision ?? 0,
        },
      });
      router.push("/seller/products");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update stock.",
      );
    } finally {
      lock.current = false;
    }
  }
  return (
    <Card>
      <div className="grid gap-5 sm:grid-cols-2">
        {quantities.map((value, index) => (
          <Field
            key={index}
            label={`Stock quantity ${index + 1}${live.variantStock?.[index] ? ` · ${[live.variantStock[index].color, live.variantStock[index].size].filter(Boolean).join(" / ")}` : ""}`}
            value={value}
            onChange={(event) =>
              setQuantities((previous) =>
                previous.map((entry, position) =>
                  position === index ? event.target.value : entry,
                ),
              )
            }
            maxLength={7}
            inputMode="numeric"
            disabled={mutation.isPending || readOnly}
          />
        ))}
      </div>
      {error && <Notice error>{error}</Notice>}
      {!readOnly && (
        <Button
          className="mt-5"
          disabled={mutation.isPending}
          onClick={() => void save()}
        >
          Update stock
        </Button>
      )}
    </Card>
  );
}
export function InventoryScreen({ id }: { id: string }) {
  const { user } = useAuth();
  const query = useSellerProduct(user?.id, id);
  return (
    <>
      <Link
        prefetch={false}
        href="/seller/products"
        className="mb-5 inline-block text-purple-800"
      >
        ← Products
      </Link>
      <Heading
        title="Manage live stock"
        description="Updates available quantities only. Pending content stays in review."
      />
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && <InventoryForm key={id} product={query.data.product} />}
    </>
  );
}
