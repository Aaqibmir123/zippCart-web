"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productReviewApi } from "./products-api";
import { useAuth } from "../../auth/auth-provider";
import { isApiError } from "../../../lib/api/api-error";
import {
  Button,
  Card,
  Heading,
  Notice,
  QueryState,
  TextArea,
} from "../../../components/ui";
import { ProductPreview } from "../../../components/product-preview";

export function ProductDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-product", user?.id, id],
    queryFn: () => productReviewApi.detail(id),
    retry: false,
  });
  const product = query.data?.product;
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function decide(decision: "approved" | "rejected") {
    if (lock.current || !product || query.isFetching || query.isError) return;
    if (decision === "rejected" && reason.trim().length < 3) {
      setError("Enter a rejection reason (at least 3 characters).");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await productReviewApi.review(
        id,
        product.submissionVersion!,
        decision,
        reason,
      );
      await Promise.all(
        [
          "admin-products",
          "admin-product",
          "seller-products",
          "seller-product",
          "inventory-alerts",
        ].map((key) => client.invalidateQueries({ queryKey: [key] })),
      );
      setReason("");
      setFeedback(
        decision === "approved"
          ? "Product approved."
          : "Submission rejected. Seller can see your reason.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Review failed.");
      if (isApiError(cause) && cause.status === 409) {
        setReason("");
        await query.refetch();
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Link
        prefetch={false}
        href="/admin/products"
        className="mb-5 inline-block text-sm font-semibold text-purple-800"
      >
        ← Product approvals
      </Link>
      <Heading
        title={product?.storeName ?? "Review submission"}
        description={
          product
            ? `Submission ${product.submissionVersion ?? 0} · ${product.moderationStatus ?? "legacy"} · ${product.submittedAt ? new Date(product.submittedAt).toLocaleString("en-IN") : "Not submitted"}`
            : undefined
        }
        actions={
          <Button
            variant="secondary"
            disabled={busy || query.isFetching}
            onClick={() => void query.refetch()}
          >
            Refresh submission
          </Button>
        }
      />
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {feedback && <Notice>{feedback}</Notice>}
      {error && <Notice error>{error}</Notice>}
      {product && (
        <div className="space-y-5">
          {product.rejectionReason && (
            <Notice error>{product.rejectionReason}</Notice>
          )}
          {product.inventoryChanged && (
            <Notice error>
              Inventory changed after this variant submission. Ask the seller to
              refresh and resubmit before approval.
            </Notice>
          )}
          <div className="grid items-start gap-5 xl:grid-cols-2">
            {product.live && (
              <ProductPreview
                title="Currently approved"
                product={product.live}
              />
            )}
            <ProductPreview
              title={
                product.live ? "Submitted changes" : "New product submission"
              }
              product={product.submitted}
            />
          </div>
          {product.archivedAt ? (
            <Notice>
              Archived by the seller. Restore the product before reviewing.
            </Notice>
          ) : (
            product.moderationStatus === "pending" && (
              <Card>
                <TextArea
                  label="Rejection reason"
                  value={reason}
                  onChange={setReason}
                  maxLength={1000}
                  disabled={busy}
                />
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    disabled={
                      busy ||
                      query.isFetching ||
                      query.isError ||
                      product.inventoryChanged
                    }
                    onClick={() => void decide("approved")}
                  >
                    Approve reviewed version
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy || query.isFetching || query.isError}
                    onClick={() => void decide("rejected")}
                  >
                    Reject with reason
                  </Button>
                </div>
              </Card>
            )
          )}
        </div>
      )}
    </>
  );
}
