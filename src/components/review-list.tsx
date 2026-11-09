"use client";
import { useState, type ReactNode } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "../features/auth/auth-provider";
import { useUrlState } from "../lib/hooks/use-url-state";
import type { Review, ReviewPage } from "../lib/contracts/reviews";
import { Badge, Button, Card, Field, Heading, QueryState, Select } from "./ui";
import { Dialog } from "./dialog";

export function ReviewList({
  title,
  scope,
  statuses,
  fetchPage,
  actions,
}: {
  title: string;
  scope: string;
  statuses: string[];
  fetchPage: (
    page: number,
    status: string,
    rating: string,
    product: string,
  ) => Promise<ReviewPage>;
  actions: (review: Review) => ReactNode;
}) {
  const { user } = useAuth();
  const url = useUrlState();
  const status = url.get("status", "all");
  const rating = url.get("rating");
  const productId = url.get("productId");
  const [draft, setDraft] = useState(productId);
  const [photo, setPhoto] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: [
      "reviews",
      "workspace",
      user?.id,
      scope,
      status,
      rating,
      productId,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchPage(pageParam, status, rating, productId),
    getNextPageParam: (last) => last.nextPage ?? undefined,
  });
  const reviews = query.data?.pages.flatMap((page) => page.reviews) ?? [];
  return (
    <>
      <Heading title={title} />
      <Card className="mb-6">
        <div className="grid items-end gap-4 sm:grid-cols-3">
          {statuses.length > 1 && (
            <Select
              label="Review status"
              value={status}
              onChange={(value) => url.set({ status: value })}
              options={statuses}
            />
          )}
          <Select
            label="Rating"
            value={rating}
            onChange={(value) => url.set({ rating: value })}
            options={[
              { value: "", label: "All ratings" },
              ...["5", "4", "3", "2", "1"].map((value) => ({
                value,
                label: `${value} stars`,
              })),
            ]}
          />
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim() || /^[a-f\d]{24}$/i.test(draft.trim()))
                url.set({ productId: draft.trim() });
            }}
          >
            <Field
              label="Filter by product ID"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button
              type="submit"
              disabled={!!draft.trim() && !/^[a-f\d]{24}$/i.test(draft.trim())}
            >
              Filter
            </Button>
          </form>
        </div>
      </Card>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
        empty={!reviews.length && query.isSuccess}
      />
      <div className="space-y-5">
        {reviews.map((review) => (
          <Card key={review.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <h2 className="text-lg font-bold">{review.productName}</h2>
              <Badge>
                {review.status}
                {review.reported ? " · Flagged" : ""}
              </Badge>
            </div>
            <p className="mt-2 break-all text-xs text-slate-500">
              Product: {review.productId}
            </p>
            <div className="my-4 flex flex-wrap items-center gap-3">
              <span
                className="text-orange-600"
                aria-label={`${review.rating} out of 5 stars`}
              >
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </span>
              <span className="text-sm font-semibold">{review.authorName}</span>
              {review.verifiedPurchase && <Badge>Verified purchase</Badge>}
            </div>
            <h3 className="font-semibold">{review.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
              {review.comment}
            </p>
            <div className="my-4 flex flex-wrap gap-3">
              {review.images.map((image, index) => (
                <button
                  key={index}
                  aria-label="View customer photo"
                  onClick={() => setPhoto(image)}
                >
                  <img
                    alt={`Customer photo ${index + 1}`}
                    src={image}
                    loading="lazy"
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                </button>
              ))}
            </div>
            {review.sellerReply && (
              <blockquote className="my-4 rounded-xl bg-purple-50 p-4">
                <p className="text-sm font-semibold text-purple-800">
                  Seller response
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                  {review.sellerReply.comment}
                </p>
              </blockquote>
            )}
            <p className="mb-5 text-xs text-slate-500">
              {review.helpfulCount} found this helpful ·{" "}
              {new Date(review.createdAt).toLocaleDateString("en-IN")}
            </p>
            {actions(review)}
          </Card>
        ))}
      </div>
      {query.hasNextPage && (
        <Button
          variant="secondary"
          className="mt-6"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Load more reviews
        </Button>
      )}
      {photo && (
        <Dialog title="Customer photo" onClose={() => setPhoto(null)}>
          <img
            src={photo}
            alt="Customer photo"
            className="max-h-[70dvh] w-full object-contain"
          />
        </Dialog>
      )}
    </>
  );
}
