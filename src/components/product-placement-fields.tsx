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
        <legend className="mb-3 font-semibold">
          Where should customers find this product?
        </legend>
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
              ? "I know the correct customer category"
              : "Ask admin to confirm the category"}
          </label>
        ))}
      </fieldset>
      {category === "Other" && (
        <Notice>
          Selling clothing or shoes? Choose Fashion in Category above. Other has
          its own product types, such as books. Typing a custom category name
          does not change the subcategory list.
        </Notice>
      )}
      {category === "Fashion" && status === "confirmed" && (
        <p className="text-sm text-slate-600">
          Choose who the product is for, then its type. For example: Men → Shoes
          or Women → Clothing → Jackets. Use the product information you can
          confirm.
        </p>
      )}
      {status === "confirmed" ? (
        <CategoryPicker
          category={category}
          value={value}
          onChange={(id) => onChange(id, "confirmed")}
          disabled={disabled}
        />
      ) : (
        <Notice>
          You can submit this product for review without choosing a subcategory.
          After approval, customers can find it in Shop All. It will not appear
          in a specific customer category until its placement is confirmed. Do
          not guess who it is for from names, photos or sizes.
        </Notice>
      )}
    </div>
  );
}
