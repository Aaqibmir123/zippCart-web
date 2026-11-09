"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Review } from "../../../lib/contracts/reviews";
import { ReviewList } from "../../../components/review-list";
import { Button, Notice, QueryState, TextArea } from "../../../components/ui";
import { adminReviewsApi } from "./reviews-api";
function ModerationActions({ review }: { review: Review }) {
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const audit = useQuery({
    queryKey: ["reviews", "audit", review.id],
    queryFn: () => adminReviewsApi.audit(review.id),
    enabled: showAudit,
  });
  async function moderate(action: string) {
    if (lock.current || reason.trim().length < 5) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await adminReviewsApi.moderate(
        review.id,
        action,
        reason.trim(),
        review.version,
      );
      await client.invalidateQueries({ queryKey: ["reviews"] });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not moderate review.",
      );
      await client.invalidateQueries({ queryKey: ["reviews", "workspace"] });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <TextArea
        label="Moderation reason"
        value={reason}
        onChange={setReason}
        maxLength={500}
        disabled={busy}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={busy || reason.trim().length < 5}
          onClick={() => void moderate("report")}
        >
          Flag review
        </Button>
        <Button
          variant="secondary"
          disabled={busy || reason.trim().length < 5}
          onClick={() =>
            void moderate(review.status === "hidden" ? "restore" : "hide")
          }
        >
          {review.status === "hidden" ? "Restore review" : "Hide review"}
        </Button>
        <Button variant="secondary" onClick={() => setShowAudit(!showAudit)}>
          {showAudit ? "Close audit history" : "View audit history"}
        </Button>
      </div>
      {error && <Notice error>{error}</Notice>}
      {showAudit && (
        <>
          <QueryState
            pending={audit.isPending}
            error={audit.error}
            retry={() => void audit.refetch()}
          />
          {audit.data?.events.map((event) => (
            <div key={event._id} className="rounded-xl bg-slate-50 p-4 text-sm">
              <p className="font-semibold">
                {event.action} ·{" "}
                {new Date(event.createdAt).toLocaleString("en-IN")}
              </p>
              <p className="mt-2">{event.reason}</p>
              {event.before && event.after && (
                <p className="mt-2">
                  {event.before.status} → {event.after.status}
                </p>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
export function AdminReviewsScreen() {
  return (
    <ReviewList
      title="Review moderation"
      scope="admin"
      statuses={["all", "published", "reported", "hidden"]}
      fetchPage={adminReviewsApi.list}
      actions={(review) => (
        <ModerationActions
          key={`${review.id}:${review.version}`}
          review={review}
        />
      )}
    />
  );
}
