"use client";
import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import {
  Button,
  Card,
  Heading,
  Notice,
  QueryState,
  Select,
} from "../../../components/ui";
import {
  useCategoryTaxonomy,
  categoryPath,
} from "../../../lib/products/category-taxonomy";
import { money } from "../../../lib/format";
import { classificationApi } from "./classification-api";
import { ClassificationEditor } from "./classification-editor";

function ProductPhoto({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-50 p-1">
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-center text-xs text-slate-500">
          Photo unavailable
        </span>
      )}
    </div>
  );
}

export function ClassificationScreen() {
  const { user } = useAuth(),
    client = useQueryClient();
  const [status, setStatus] = useState<"pending" | "all">("pending");
  const [selected, setSelected] = useState<string | null>(null),
    [feedback, setFeedback] = useState("");
  const query = useInfiniteQuery({
    queryKey: ["admin-classifications", user?.id, status],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      classificationApi.list(status, pageParam, signal),
    getNextPageParam: (last) => last.nextPage ?? undefined,
    retry: false,
  });
  const enabled = query.data?.pages[0]?.enabled === true;
  const taxonomy = useCategoryTaxonomy(enabled),
    nodes = taxonomy.data?.categories ?? [];
  const products = query.data?.pages.flatMap((page) => page.products) ?? [];
  async function saved() {
    setSelected(null);
    setFeedback(
      "Classification saved. Images, prices and stock are unchanged.",
    );
    await Promise.all(
      ["admin-classifications", "admin-classification-capability"].map((key) =>
        client.invalidateQueries({ queryKey: [key] }),
      ),
    );
  }
  return (
    <>
      <Link
        href="/admin/products"
        prefetch={false}
        className="mb-4 inline-block font-semibold text-purple-800"
      >
        Back to Products
      </Link>
      <Heading
        title="Product classification"
        description="Confirm product placement one product at a time. Published products awaiting classification remain available in Shop All."
      />
      {feedback && (
        <div role="status">
          <Notice>{feedback}</Notice>
        </div>
      )}
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.isSuccess && !enabled && (
        <Notice>
          Product classification is unavailable in this environment.
        </Notice>
      )}
      {enabled && (
        <>
          <Card className="mb-5">
            <Select
              label="Classification status"
              value={status}
              options={[
                { value: "pending", label: "Needs manual review" },
                { value: "all", label: "All published products" },
              ]}
              onChange={(value) => {
                setStatus(value as "pending" | "all");
                setSelected(null);
              }}
            />
            <p className="mt-3 text-sm">
              {query.data?.pages[0]?.total ?? 0} products. Select a category
              only after confirming the audience. Photos and sizes alone are not
              confirmation.
            </p>
          </Card>
          <QueryState
            pending={taxonomy.isPending}
            error={taxonomy.error}
            retry={() => void taxonomy.refetch()}
          />
          {query.isSuccess && !products.length && (
            <Notice>
              No products in this review queue. Shop All remains available.
            </Notice>
          )}
          <div className="space-y-5">
            {products.map((product) => (
              <Card key={product.id}>
                <div className="flex gap-4">
                  <ProductPhoto src={product.coverImage} name={product.name} />
                  <div>
                    <h2 className="font-bold">{product.name}</h2>
                    <p className="text-sm">
                      {product.storeName} · {money(product.price)} · Stock{" "}
                      {product.stock}
                    </p>
                    <p className="mt-2 text-sm">
                      {categoryPath(nodes, product.categoryId)
                        .map((node) => node.name)
                        .join(" / ") || product.category}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.id} · {product.status.replaceAll("_", " ")}
                    </p>
                  </div>
                </div>
                {selected === product.id ? (
                  <ClassificationEditor
                    key={`${product.id}:${product.revision}`}
                    product={product}
                    nodes={nodes}
                    disabled={
                      !taxonomy.isSuccess ||
                      taxonomy.isError ||
                      query.isFetching ||
                      query.isError
                    }
                    refresh={() => query.refetch()}
                    onSaved={saved}
                    onCancel={() => setSelected(null)}
                  />
                ) : (
                  <Button
                    className="mt-4"
                    variant="secondary"
                    onClick={() => {
                      setSelected(product.id);
                      setFeedback("");
                    }}
                  >
                    Review classification
                  </Button>
                )}
              </Card>
            ))}
          </div>
          {query.hasNextPage && (
            <Button
              className="mt-5"
              disabled={query.isFetching}
              onClick={() => void query.fetchNextPage()}
            >
              Load more
            </Button>
          )}
        </>
      )}
    </>
  );
}
