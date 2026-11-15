"use client";
import { useState } from "react";
import { Card, Select, Field, Notice } from "../../../components/ui";
import type { SellerProduct } from "../../../lib/contracts/product";
import { useCategoryTaxonomy } from "../../../lib/products/category-taxonomy";
import {
  placementError,
  placementSummary,
  productCategories,
  type CategoryPlacement,
  type ReviewPlacementInput,
} from "../../../lib/products/category-placement";
import { PlacementFields } from "../../../components/product-placement-fields";

export function ApprovalPlacement({
  product,
  onChange,
  disabled,
}: {
  product: SellerProduct;
  onChange: (placement: ReviewPlacementInput | undefined) => void;
  disabled: boolean;
}) {
  const [category, setCategory] = useState(product.category),
    [id, setId] = useState(product.categoryId ?? "");
  const [status, setStatus] = useState<CategoryPlacement>(
    product.categoryPlacement ??
      (product.categoryId ? "confirmed" : "needs-classification"),
  );
  const [custom, setCustom] = useState(product.customCategory ?? ""),
    [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState("");
  const taxonomy = useCategoryTaxonomy();
  function reset() {
    setConfirmed(false);
    setError("");
    onChange(undefined);
  }
  function confirm() {
    if (disabled) return;
    if (confirmed) {
      reset();
      return;
    }
    const invalid = placementError(
      taxonomy.data?.categories ?? [],
      category,
      id || null,
      status,
    );
    if (invalid || (category === "Other" && !id && !custom.trim())) {
      setError(invalid ?? "Enter a product category.");
      return;
    }
    setConfirmed(true);
    setError("");
    onChange({
      category,
      categoryId: id || null,
      categoryPlacement: status,
      customCategory: category === "Other" ? custom.trim() : "",
      confirmed: true,
    });
  }
  return (
    <Card className="space-y-4">
      <h3 className="font-semibold">Review customer placement</h3>
      <Select
        label="Placement catalog"
        value={category}
        options={productCategories.map((value) => ({ value, label: value }))}
        disabled={disabled}
        onChange={(value) => {
          reset();
          setCategory(value);
          setId("");
          setCustom("");
        }}
      />
      <PlacementFields
        category={category}
        value={id}
        status={status}
        disabled={disabled}
        onChange={(value, state) => {
          reset();
          setId(value);
          setStatus(state);
        }}
      />
      {category === "Other" && (
        <Field
          label="Placement custom category"
          value={custom}
          maxLength={60}
          disabled={disabled}
          onChange={(event) => {
            reset();
            setCustom(event.target.value);
          }}
        />
      )}
      <p className="font-semibold">
        {placementSummary(taxonomy.data?.categories ?? [], id || null, status)}
      </p>
      {error && <Notice error>{error}</Notice>}
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          aria-label="Confirm customer placement"
          disabled={disabled}
          checked={confirmed}
          onChange={confirm}
        />
        Confirm customer placement
        {status === "needs-classification"
          ? " (Shop All only after approval)"
          : ""}
      </label>
    </Card>
  );
}
