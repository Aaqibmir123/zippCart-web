"use client";
import { Notice } from "./ui";
import type { CategoryPlacement } from "../lib/products/category-placement";
import { CategoryPicker } from "./category-picker";

export function PlacementFields({
  category,
  value,
  status,
  onChange,
  disabled,
}: {
  category: string;
  value: string;
  status: CategoryPlacement;
  onChange: (id: string, status: CategoryPlacement) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <fieldset disabled={disabled} className="space-y-3">
        <legend className="mb-3 font-semibold">Customer placement</legend>
        {(["confirmed", "needs-classification"] as const).map((item) => (
          <label
            key={item}
            className="flex items-center gap-3 rounded-xl bg-purple-50 p-3"
          >
            <input
              type="radio"
              checked={status === item}
              onChange={() =>
                onChange(item === "needs-classification" ? "" : value, item)
              }
            />
            {item === "confirmed"
              ? "Audience confirmed — choose final category"
              : "Needs classification — audience not confirmed"}
          </label>
        ))}
      </fieldset>
      {status === "confirmed" ? (
        <CategoryPicker
          category={category}
          value={value}
          onChange={(id) => onChange(id, "confirmed")}
          disabled={disabled}
        />
      ) : (
        <Notice>
          Do not guess audience from names, photos or sizes. After approval,
          this product stays accessible through Shop All.
        </Notice>
      )}
    </div>
  );
}
