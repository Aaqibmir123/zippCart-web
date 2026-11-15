"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { classificationApi } from "./classification-api";

export function ClassificationLink() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["admin-classification-capability", user?.id],
    queryFn: ({ signal }) => classificationApi.list("pending", 1, signal),
    staleTime: 30000,
    retry: false,
  });
  if (!query.data?.enabled) return null;
  return (
    <Link
      href="/admin/products/classification"
      prefetch={false}
      className="mb-5 inline-flex min-h-11 items-center rounded-xl border border-purple-200 px-4 font-semibold text-purple-800"
    >
      Classify products ({query.data.total} pending)
    </Link>
  );
}
