"use client";
import { useRef, useState } from "react";
import {
  Button,
  Check,
  Notice,
  Select,
  TextArea,
} from "../../../components/ui";
import {
  categoryPath,
  type CatalogCategory,
} from "../../../lib/products/category-taxonomy";
import { isApiError } from "../../../lib/api/api-error";
import {
  classificationApi,
  classificationOptions,
  type ClassificationProduct,
} from "./classification-api";

export function ClassificationEditor({
  product,
  nodes,
  disabled,
  refresh,
  onSaved,
  onCancel,
}: {
  product: ClassificationProduct;
  nodes: CatalogCategory[];
  disabled: boolean;
  refresh: () => Promise<unknown>;
  onSaved: () => Promise<unknown>;
  onCancel: () => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [confirmed, setConfirmed] = useState(false),
    [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const options = classificationOptions(nodes, product.category);
  const selected = options.find((option) => option.value === categoryId);
  async function save() {
    if (
      lock.current ||
      disabled ||
      !confirmed ||
      !selected ||
      reason.trim().length < 3
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await classificationApi.save(product.id, {
        categoryId,
        revision: product.revision,
        audienceConfirmed: true,
        reason: reason.trim(),
      });
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save classification.",
      );
      if (isApiError(cause) && cause.status === 409) {
        setConfirmed(false);
        await refresh();
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="mt-5 space-y-4 border-t border-purple-100 pt-5">
      <p className="text-sm">
        Current:{" "}
        {categoryPath(nodes, product.categoryId)
          .map((node) => node.name)
          .join(" / ") || product.category}
      </p>
      <p className="whitespace-pre-line text-sm text-slate-700">
        {product.description}
      </p>
      <p className="text-sm">
        Recorded sizes: {product.sizes.join(", ") || "Not recorded"}
      </p>
      <p className="text-sm">
        Original category: {product.originalCategory}
        {product.customCategory ? ` / ${product.customCategory}` : ""}
      </p>
      {product.reason && <Notice>{product.reason}</Notice>}
      <Select
        label="Confirmed category"
        value={categoryId}
        disabled={disabled || busy}
        options={[
          { value: "", label: "Keep current assignment until confirmed" },
          ...options,
        ]}
        onChange={(value) => {
          setCategoryId(value);
          setConfirmed(false);
        }}
      />
      <TextArea
        label="Audience confirmation / evidence"
        value={reason}
        maxLength={500}
        disabled={disabled || busy}
        onChange={setReason}
      />
      <Check
        label="I confirm this product's intended audience and the selected category."
        checked={confirmed}
        onChange={setConfirmed}
        disabled={disabled || busy || !selected}
      />
      {selected && (
        <p className="text-sm font-semibold text-purple-800">
          Will assign to: {selected.label}
        </p>
      )}
      {error && <Notice error>{error}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={
            disabled ||
            busy ||
            !confirmed ||
            !selected ||
            reason.trim().length < 3
          }
          onClick={() => void save()}
        >
          {busy ? "Saving..." : "Confirm classification"}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onCancel}>
          Keep pending / Close
        </Button>
      </div>
    </div>
  );
}
