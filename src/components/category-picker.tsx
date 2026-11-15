"use client";
import { Button, Notice, Select } from "./ui";
import {
  placementError,
  placementSummary,
} from "../lib/products/category-placement";
import {
  categoryPath,
  useCategoryTaxonomy,
} from "../lib/products/category-taxonomy";

export function CategoryPicker({
  category,
  value,
  onChange,
  disabled,
}: {
  category: string;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const query = useCategoryTaxonomy(!!category);
  if (!category) return null;
  if (query.isPending) return <Notice>Loading subcategories...</Notice>;
  if (query.isError)
    return (
      <div className="space-y-3">
        <Notice error>
          Could not load subcategories. Your current assignment is unchanged.
        </Notice>
        <Button
          variant="secondary"
          disabled={disabled || query.isFetching}
          onClick={() => void query.refetch()}
        >
          Retry subcategories
        </Button>
      </div>
    );
  const nodes = (query.data?.categories ?? []).filter(
    (node) => node.legacyCategory === category,
  );
  const root = nodes.find((node) => node.parentId === null);
  const path = categoryPath(nodes, value);
  if (value && !path.length)
    return (
      <Notice>
        The saved subcategory is currently unavailable. Its assignment will be
        preserved when you save.
      </Notice>
    );
  if (!root)
    return (
      <Notice>
        Subcategories are not available for this category. Products remain
        accessible through Shop All.
      </Notice>
    );
  if (!nodes.some((node) => node.parentId === root.id))
    return (
      <Button disabled={disabled} onClick={() => onChange(root.id)}>
        Select {root.name}
      </Button>
    );
  const audiences = nodes
    .filter((node) => node.parentId && Number.isInteger(node.customerPosition))
    .sort((a, b) => a.customerPosition! - b.customerPosition!);
  const audience = path.findIndex((node) =>
    Number.isInteger(node.customerPosition),
  );
  const parents = audiences.length
    ? [root, ...(audience >= 0 ? path.slice(audience) : [])]
    : path.length
      ? path
      : [root];
  return (
    <div className="space-y-4">
      {parents.map((parent, index) => {
        const children = (
          parent.id === root.id && audiences.length
            ? audiences
            : nodes.filter((node) => node.parentId === parent.id)
        ).sort(
          (a, b) => a.position - b.position || a.name.localeCompare(b.name),
        );
        if (!children.length) return null;
        return (
          <Select
            key={parent.id}
            label={`${parent.name} subcategory`}
            value={parents[index + 1]?.id ?? ""}
            options={[
              {
                value: "",
                label: "Choose a final subcategory",
              },
              ...children.map((node) => ({ value: node.id, label: node.name })),
            ]}
            disabled={disabled}
            onChange={(id) => onChange(id)}
          />
        );
      })}
      <p className="text-sm text-slate-600">
        {placementSummary(nodes, value || null, "confirmed")}
      </p>
      {!!value && placementError(nodes, category, value, "confirmed") && (
        <Notice error>
          {placementError(nodes, category, value, "confirmed")}
        </Notice>
      )}
    </div>
  );
}
