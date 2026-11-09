import type {
  ProductColor,
  SellerProduct,
  SellerProductInput,
} from "../../../lib/contracts/product";

export const productCategories = [
  "Fashion",
  "Watches",
  "Beauty",
  "Home",
  "Accessories",
  "Electronics",
  "Other",
];
export const sizeModes = [
  "none",
  "adult",
  "kids",
  "footwear-uk",
  "footwear-eu",
  "custom",
] as const;
export type SizeMode = (typeof sizeModes)[number];
export type ProductFields = {
  name: string;
  category: string;
  customCategory: string;
  description: string;
  price: string;
  mrp: string;
  stock: string;
  brand: string;
  sku: string;
};
export type ProductDraft = {
  fields: ProductFields;
  sizes: string[];
  images: string[];
  colors: ProductColor[];
  quantities: Record<string, string>;
  active: boolean;
  creationKey: string;
};
export const variantKey = (color: string, size: string) =>
  JSON.stringify([color, size]);
export function variantRows(colors: ProductColor[], sizes: string[]) {
  return (
    colors.length ? colors.map((color) => color.name.trim()) : [""]
  ).flatMap((color) =>
    (sizes.length ? sizes : [""]).map((size) => ({
      color,
      size,
      key: variantKey(color, size),
    })),
  );
}
export function sizeGroups(
  mode: SizeMode,
): { label: string; values: string[] }[] {
  if (mode === "adult")
    return [
      {
        label: "Letter sizes",
        values: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
      },
      {
        label: "Numeric sizes",
        values: Array.from({ length: 9 }, (_, index) => String(28 + index * 2)),
      },
    ];
  if (mode === "kids")
    return [
      {
        label: "Age-based sizes",
        values: [
          "0-3 months",
          "3-6 months",
          "6-12 months",
          "1-2 years",
          "2-3 years",
          "3-4 years",
          "4-5 years",
          "5-6 years",
          "6-7 years",
          "7-8 years",
          "8-9 years",
          "9-10 years",
          "10-11 years",
          "11-12 years",
          "12-13 years",
          "13-14 years",
        ],
      },
      {
        label: "Numeric sizes",
        values: Array.from({ length: 15 }, (_, index) => String(index + 2)),
      },
    ];
  if (mode === "footwear-uk")
    return [
      {
        label: "UK/India footwear size",
        values: Array.from({ length: 13 }, (_, index) => String(index + 1)),
      },
    ];
  if (mode === "footwear-eu")
    return [
      {
        label: "EU footwear size",
        values: Array.from({ length: 13 }, (_, index) => String(index + 35)),
      },
    ];
  return [];
}
export function initialFields(product?: SellerProduct): ProductFields {
  return {
    name: product?.name ?? "",
    category: product?.category ?? "",
    customCategory: product?.customCategory ?? "",
    description: product?.description ?? "",
    price: product?.price.toString() ?? "",
    mrp: product?.mrp.toString() ?? "",
    stock: product?.stock.toString() ?? "",
    brand: product?.brand ?? "",
    sku: product?.sku ?? "",
  };
}
export function buildProduct(
  draft: ProductDraft,
  product?: SellerProduct,
): SellerProductInput {
  const { fields, sizes, images, active } = draft;
  if (
    fields.name.trim().length < 2 ||
    !fields.category ||
    !fields.description.trim()
  )
    throw new Error("Add a product name, category and description.");
  if (fields.category === "Other" && !fields.customCategory.trim())
    throw new Error("Enter a product category.");
  if (fields.sku.trim() && !/^[A-Za-z0-9_-]+$/.test(fields.sku.trim()))
    throw new Error(
      "SKU can contain letters, numbers, hyphens and underscores only.",
    );
  if (
    ![fields.price, fields.mrp].every(
      (value) =>
        /^\d+(\.\d{1,2})?$/.test(value) &&
        Number(value) > 0 &&
        Number(value) <= 1000000,
    )
  )
    throw new Error(
      "Enter valid prices greater than zero, with up to two decimals.",
    );
  if (Number(fields.price) > Number(fields.mrp))
    throw new Error("Selling price cannot be greater than MRP.");
  if (
    sizes.length > 20 ||
    sizes.some((value) => !value.trim() || value.length > 30) ||
    new Set(sizes.map((value) => value.trim().toLowerCase())).size !==
      sizes.length
  )
    throw new Error("Add up to 20 unique sizes.");
  const colors = draft.colors.map((color) => ({
    name: color.name.trim(),
    images: color.images,
  }));
  if (colors.some((color) => !color.name || !color.images.length))
    throw new Error("Add a color name and at least one photo for each color.");
  if (
    new Set(colors.map((color) => color.name.toLowerCase())).size !==
    colors.length
  )
    throw new Error("Each color needs a unique name.");
  const photos = [...images, ...colors.flatMap((color) => color.images)];
  if (!photos.length) throw new Error("Add at least one product photo.");
  if (
    images.length > 5 ||
    colors.some((color) => color.images.length > 4) ||
    photos.length > 12
  )
    throw new Error(
      "Use up to 5 general photos, 4 per color and 12 photos total.",
    );
  if (photos.reduce((sum, image) => sum + image.length, 0) > 4000000)
    throw new Error("Photos are too large together. Remove some photos.");
  const variants = !!(colors.length || sizes.length);
  if (
    product &&
    new Set(
      product.variantStock?.map((value) => variantKey(value.color, value.size)),
    ).size !== (product.variantStock?.length ?? 0)
  )
    throw new Error(
      "Existing variant inventory is duplicated. Refresh before editing.",
    );
  const rows = variantRows(colors, sizes);
  if (
    variants &&
    rows.some(
      (row) =>
        !/^\d+$/.test(draft.quantities[row.key] ?? "") ||
        Number(draft.quantities[row.key]) > 1000000,
    )
  )
    throw new Error(
      "Enter stock for each color/size. Use 0 for unavailable variants.",
    );
  if (
    !variants &&
    (!/^\d+$/.test(fields.stock) || Number(fields.stock) > 1000000)
  )
    throw new Error("Enter stock as a whole number from 0 to 1,000,000.");
  const variantStock = variants
    ? rows.map(({ color, size, key }) => ({
        color,
        size,
        stock: Number(draft.quantities[key]),
      }))
    : [];
  const stock = variants
    ? variantStock.reduce((sum, variant) => sum + variant.stock, 0)
    : Number(fields.stock);
  if (stock > 1000000) throw new Error("Total stock cannot exceed 1,000,000.");
  return {
    name: fields.name.trim(),
    category: fields.category,
    customCategory:
      fields.category === "Other" ? fields.customCategory.trim() : "",
    description: fields.description.trim(),
    brand: fields.brand.trim(),
    sku: fields.sku.trim(),
    sizes,
    images,
    colors,
    price: Number(fields.price),
    mrp: Number(fields.mrp),
    stock,
    variantStock,
    active,
    ...(product
      ? {
          expectedInventoryRevision: product.inventoryRevision ?? 0,
          expectedSubmissionVersion: product.submissionVersion ?? 0,
        }
      : { creationKey: draft.creationKey }),
  };
}
