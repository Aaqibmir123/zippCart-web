"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Review } from "../../../lib/contracts/reviews";
import {
  REVIEW_POLICY,
  REVIEW_POLICY_VERSION,
} from "../../../lib/contracts/review-policy";
import { ReviewList } from "../../../components/review-list";
import { Button, Check, Notice, TextArea } from "../../../components/ui";
import { sellerReviewsApi } from "./reviews-api";
function ReplyForm({ review }: { review: Review }) {
  const client = useQueryClient();
  const [comment, setComment] = useState(review.sellerReply?.comment ?? "");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-slate-600">{REVIEW_POLICY}</p>
      <Check
        label="I accept the review content policy"
        checked={accepted}
        onChange={setAccepted}
        disabled={busy}
      />
      {review.status === "published" && (
        <>
          <TextArea
            label="Seller reply"
            value={comment}
            onChange={setComment}
            disabled={busy}
            maxLength={1000}
          />
          <Button
            disabled={busy || !accepted || comment.trim().length < 2}
            onClick={async () => {
              if (lock.current || !accepted) return;
              lock.current = true;
              setBusy(true);
              setError("");
              try {
                await sellerReviewsApi.reply(
                  review.id,
                  comment.trim(),
                  review.version,
                  REVIEW_POLICY_VERSION,
                );
                await client.invalidateQueries({ queryKey: ["reviews"] });
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not save reply.",
                );
                await client.invalidateQueries({
                  queryKey: ["reviews", "workspace"],
                });
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            Save reply
          </Button>
        </>
      )}
      {error && <Notice error>{error}</Notice>}
    </div>
  );
}
export function SellerReviewsScreen() {
  return (
    <ReviewList
      title="Customer reviews"
      scope="seller"
      statuses={["all"]}
      fetchPage={sellerReviewsApi.list}
      actions={(review) => (
        <ReplyForm key={`${review.id}:${review.version}`} review={review} />
      )}
    />
  );
}
