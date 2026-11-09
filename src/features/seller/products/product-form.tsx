"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../auth/auth-provider";
import type { SellerProduct } from "../../../lib/contracts/product";
import { useUrlState } from "../../../lib/hooks/use-url-state";
import {
  Button,
  Card,
  Field,
  Heading,
  Notice,
  Select,
  TextArea,
} from "../../../components/ui";
import { ProductPreview } from "../../../components/product-preview";
import { ProductPhotos } from "./product-photos";
import { useProductEditor } from "./use-product-editor";
import {
  productCategories,
  sizeGroups,
  sizeModes,
  variantRows,
  type SizeMode,
} from "./product-model";

export function ProductForm({ product }: { product?: SellerProduct }) {
  const { user } = useAuth();
  const state = useProductEditor(user?.id, product);
  const url = useUrlState();
  const step = Math.min(2, Math.max(0, Number(url.get("step", "0")) || 0));
  const [showApproved, setShowApproved] = useState(false);
  const rows = variantRows(state.colors, state.sizes);
  const hasVariants = !!(state.colors.length || state.sizes.length);
  function field(
    key: keyof typeof state.fields,
    label: string,
    maxLength = 100,
  ) {
    return (
      <Field
        label={label}
        value={state.fields[key]}
        onChange={(event) =>
          state.setFields((previous) => ({
            ...previous,
            [key]: event.target.value,
          }))
        }
        maxLength={maxLength}
        inputMode={
          ["price", "mrp", "stock"].includes(key) ? "decimal" : undefined
        }
        disabled={state.busy}
      />
    );
  }
  return (
    <>
      <Link
        prefetch={false}
        className="mb-5 inline-block font-semibold text-purple-800"
        href="/seller/products"
      >
        ← Products
      </Link>
      <Heading
        title={product ? "Edit product" : "Add a product"}
        description={`Step ${step + 1} of 3 · ${["Details", "Stock & sizes", "Photos"][step]}`}
      />
      {product && (
        <Card className="mb-5">
          <p className="font-semibold">
            {product.moderationStatus ?? "legacy"}
          </p>
          {product.rejectionReason && (
            <Notice error>{product.rejectionReason}</Notice>
          )}
          <p className="my-3 text-sm leading-6">
            Content needs approval. Stock updates apply immediately when sizes
            and colors stay the same.
          </p>
          {product.publicVersion && (
            <Button
              variant="secondary"
              onClick={() => setShowApproved(!showApproved)}
            >
              {showApproved ? "Hide approved version" : "View approved version"}
            </Button>
          )}
        </Card>
      )}
      {showApproved && product?.publicVersion && (
        <ProductPreview
          title="Approved public version"
          product={product.publicVersion}
        />
      )}
      <nav
        aria-label="Product form steps"
        className="my-5 flex flex-wrap gap-3"
      >
        {["Details", "Stock & sizes", "Photos"].map((label, index) => (
          <Button
            key={label}
            variant={step === index ? "primary" : "secondary"}
            disabled={state.busy}
            onClick={() => url.set({ step: index })}
          >
            {index + 1}. {label}
          </Button>
        ))}
      </nav>
      <div className="space-y-5">
        {state.error && <Notice error>{state.error}</Notice>}
        {step === 0 && (
          <Card>
            <div className="grid gap-5 sm:grid-cols-2">
              {field("name", "Product name")}
              <Select
                label="Category"
                value={state.fields.category}
                onChange={(value) =>
                  state.setFields((previous) => ({
                    ...previous,
                    category: value,
                    customCategory:
                      value === "Other" ? previous.customCategory : "",
                  }))
                }
                options={[
                  { value: "", label: "Choose category" },
                  ...productCategories,
                ]}
                disabled={state.busy}
              />
              {state.fields.category === "Other" &&
                field("customCategory", "Enter product category", 60)}
              {field("brand", "Brand (optional)", 80)}
              {field("sku", "SKU / Product code (optional)", 60)}
              <div className="sm:col-span-2">
                <TextArea
                  label="Description"
                  value={state.fields.description}
                  onChange={(value) =>
                    state.setFields((previous) => ({
                      ...previous,
                      description: value,
                    }))
                  }
                  maxLength={1000}
                  disabled={state.busy}
                />
              </div>
            </div>
          </Card>
        )}
        {step === 1 && (
          <>
            <Card>
              <div className="grid gap-5 sm:grid-cols-2">
                {field("price", "Selling price (₹)", 10)}
                {field("mrp", "MRP (₹)", 10)}
                {!hasVariants && field("stock", "Stock quantity", 7)}
              </div>
              {!!product?.exchangeReserved && (
                <p className="mt-4 text-sm text-orange-800">
                  {product.exchangeReserved} units reserved for exchanges. Keep
                  sizes/colors unchanged until reservations clear.
                </p>
              )}
              <div className="mt-5 max-w-sm">
                <Select
                  label="Size options"
                  value={state.sizeMode}
                  onChange={(value) => state.setSizeMode(value as SizeMode)}
                  options={sizeModes.map((value, index) => ({
                    value,
                    label: [
                      "No size",
                      "Adult clothing",
                      "Kids clothing",
                      "Footwear: UK/India",
                      "Footwear: EU",
                      "Custom sizes",
                    ][index],
                  }))}
                  disabled={state.busy}
                />
              </div>
              {state.sizeMode === "none" && !!state.sizes.length && (
                <p className="mt-3 text-sm text-orange-800">
                  Remove selected sizes below to use no-size stock.
                </p>
              )}
              {sizeGroups(state.sizeMode).map((group) => (
                <div key={group.label} className="mt-5">
                  <h3 className="mb-3 font-semibold">{group.label}</h3>
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((value) => (
                      <Button
                        key={value}
                        variant={
                          state.sizes.some(
                            (size) =>
                              size.toLowerCase() === value.toLowerCase(),
                          )
                            ? "primary"
                            : "secondary"
                        }
                        disabled={state.busy}
                        onClick={() => state.toggleSize(value)}
                      >
                        {value}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
              {state.sizeMode === "custom" && (
                <div className="mt-5 flex items-end gap-3">
                  <Field
                    label="Custom size"
                    value={state.customSize}
                    onChange={(event) =>
                      state.setCustomSize(event.target.value)
                    }
                    maxLength={30}
                  />
                  <Button disabled={state.busy} onClick={state.addCustomSize}>
                    Add size
                  </Button>
                </div>
              )}
              {!!state.sizes.length && (
                <div className="mt-5">
                  <h3 className="mb-3 font-semibold">Selected sizes</h3>
                  <div className="flex flex-wrap gap-2">
                    {state.sizes.map((size) => (
                      <Button
                        key={size}
                        variant="secondary"
                        aria-label={`Remove size ${size}`}
                        disabled={state.busy}
                        onClick={() => state.toggleSize(size)}
                      >
                        {size} ×
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {state.sizeMode.startsWith("footwear") && (
                <p className="mt-4 text-sm text-slate-600">
                  UK/India and EU sizes are different. Choose the labels used on
                  your product.
                </p>
              )}
            </Card>
            <Card>
              <h2 className="mb-4 text-lg font-bold">Colors</h2>
              <div className="space-y-4">
                {state.colors.map((color, index) => (
                  <div key={index} className="flex items-end gap-3">
                    <Field
                      label={`Color ${index + 1} name`}
                      value={color.name}
                      onChange={(event) =>
                        state.setColors((previous) =>
                          previous.map((entry, position) =>
                            position === index
                              ? { ...entry, name: event.target.value }
                              : entry,
                          ),
                        )
                      }
                      maxLength={40}
                      disabled={state.busy}
                    />
                    <Button
                      variant="secondary"
                      disabled={state.busy}
                      onClick={() =>
                        state.setColors((previous) =>
                          previous.filter((_, position) => position !== index),
                        )
                      }
                    >
                      Remove color {index + 1}
                    </Button>
                  </div>
                ))}
              </div>
              {state.colors.length < 8 && (
                <Button
                  className="mt-4"
                  variant="secondary"
                  disabled={state.busy}
                  onClick={() =>
                    state.setColors((previous) => [
                      ...previous,
                      { name: "", images: [] },
                    ])
                  }
                >
                  Add color
                </Button>
              )}
              {hasVariants && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <h3 className="font-semibold sm:col-span-2">
                    Stock per variant
                  </h3>
                  {rows.map((row) => (
                    <Field
                      key={row.key}
                      label={`Stock ${row.color} ${row.size}`}
                      value={state.quantities[row.key] ?? ""}
                      onChange={(event) =>
                        state.setQuantities((previous) => ({
                          ...previous,
                          [row.key]: event.target.value,
                        }))
                      }
                      inputMode="numeric"
                      maxLength={7}
                      disabled={state.busy}
                    />
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
        {step === 2 && <ProductPhotos state={state} />}
        <div className="flex flex-wrap justify-end gap-3">
          {step > 0 && (
            <Button
              variant="secondary"
              disabled={state.busy}
              onClick={() => url.set({ step: step - 1 })}
            >
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button
              disabled={state.busy}
              onClick={() => url.set({ step: step + 1 })}
            >
              Continue
            </Button>
          ) : (
            <Button disabled={state.busy} onClick={() => void state.save()}>
              {state.busy
                ? "Saving…"
                : product
                  ? "Save / submit changes"
                  : "Submit for review"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
