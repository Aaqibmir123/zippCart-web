"use client";
import { useState } from "react";
import type { SellerProduct } from "../lib/contracts/product";
import { money } from "../lib/format";
import { Card, Details } from "./ui";
import { Dialog } from "./dialog";
export function ProductPreview({
  title,
  product,
}: {
  title: string;
  product: SellerProduct;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  return (
    <Card>
      <h2 className="mb-5 text-lg font-bold">{title}</h2>
      <h3 className="mb-4 text-xl font-semibold">{product.name}</h3>
      <Details
        values={{
          Category: `${product.category}${product.customCategory ? ` · ${product.customCategory}` : ""}`,
          Brand: product.brand,
          SKU: product.sku,
          Price: money(product.price),
          MRP: money(product.mrp),
          Discount:
            product.mrp > 0
              ? `${Math.round((1 - product.price / product.mrp) * 100)}%`
              : "0%",
          Stock: product.stock,
          Sizes: product.sizes.join(", ") || "No size",
          Status: product.active ? "Active" : "Inactive",
          "Exchange reserved": product.exchangeReserved ?? 0,
        }}
      />
      <p className="mt-5 whitespace-pre-wrap text-sm leading-7">
        {product.description}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {product.images.map((image, index) => (
          <button
            type="button"
            key={index}
            aria-label={`View ${product.name} photo ${index + 1}`}
            onClick={() => setPhoto(image)}
          >
            <img
              src={image}
              alt={`${product.name} photo ${index + 1}`}
              loading="lazy"
              className="aspect-square w-full rounded-xl object-contain"
            />
          </button>
        ))}
      </div>
      {product.colors.map((color) => (
        <div key={color.name} className="mt-5">
          <h4 className="font-semibold">{color.name}</h4>
          <div className="mt-3 flex flex-wrap gap-3">
            {color.images.map((image, index) => (
              <button
                type="button"
                key={index}
                aria-label={`View ${color.name} photo ${index + 1}`}
                onClick={() => setPhoto(image)}
              >
                <img
                  src={image}
                  alt={`${color.name} photo ${index + 1}`}
                  loading="lazy"
                  className="h-24 w-24 rounded-xl object-contain"
                />
              </button>
            ))}
          </div>
        </div>
      ))}
      {product.variantStock?.length ? (
        <div className="mt-5">
          <h4 className="mb-3 font-semibold">Variant inventory</h4>
          {product.variantStock.map((variant, index) => (
            <p key={index} className="py-1 text-sm">
              {[variant.color, variant.size].filter(Boolean).join(" / ")}:{" "}
              {variant.stock}
            </p>
          ))}
        </div>
      ) : null}
      {photo && (
        <Dialog title="Product photo" onClose={() => setPhoto(null)}>
          <img
            src={photo}
            alt="Product photo"
            className="max-h-[70dvh] w-full object-contain"
          />
        </Dialog>
      )}
    </Card>
  );
}
