"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ProductColor,
  SellerProduct,
} from "../../../lib/contracts/product";
import { requestKey } from "../../../lib/contracts/returns";
import { uploadProductImage } from "../../../lib/media/images";
import {
  assertUserSession,
  type SessionScope,
} from "../../../lib/auth/session-scope";
import { isApiError } from "../../../lib/api/api-error";
import { useSaveSellerProduct } from "./use-products";
import {
  buildProduct,
  initialFields,
  variantKey,
  type SizeMode,
} from "./product-model";

export function useProductEditor(ownerId?: string, product?: SellerProduct) {
  const router = useRouter();
  const [original] = useState(product);
  const [creationKey] = useState(requestKey);
  const [fields, setFields] = useState(() => initialFields(product));
  const [active, setActive] = useState(product?.active ?? true);
  const [sizes, setSizes] = useState(product?.sizes ?? []);
  const [images, setImages] = useState(product?.images ?? []);
  const [colors, setColors] = useState<ProductColor[]>(product?.colors ?? []);
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (product?.variantStock ?? []).map((variant) => [
        variantKey(variant.color, variant.size),
        String(variant.stock),
      ]),
    ),
  );
  const [sizeMode, setSizeMode] = useState<SizeMode>(
    product?.sizes.length ? "custom" : "none",
  );
  const [customSize, setCustomSize] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const lock = useRef(false);
  const pickerLock = useRef(false);
  const [picking, setPicking] = useState(false);
  const saveMutation = useSaveSellerProduct(ownerId);
  const photoCount =
    images.length + colors.reduce((sum, color) => sum + color.images.length, 0);
  function toggleSize(value: string) {
    setError("");
    if (sizes.some((size) => size.toLowerCase() === value.toLowerCase()))
      setSizes(
        sizes.filter((size) => size.toLowerCase() !== value.toLowerCase()),
      );
    else if (sizes.length < 20) setSizes([...sizes, value]);
    else setError("Add up to 20 unique sizes.");
  }
  function addCustomSize() {
    const value = customSize.trim();
    if (!value || value.length > 30) {
      setError("Enter a size label from 1 to 30 characters.");
      return;
    }
    if (sizes.some((size) => size.toLowerCase() === value.toLowerCase())) {
      setError("Each size must be unique.");
      return;
    }
    toggleSize(value);
    setCustomSize("");
  }
  async function photos(
    files: File[],
    session: SessionScope,
    colorIndex?: number,
  ) {
    if (pickerLock.current || lock.current) return;
    const current =
      colorIndex === undefined
        ? images.length
        : colors[colorIndex].images.length;
    const remaining = Math.min(
      12 - photoCount,
      (colorIndex === undefined ? 5 : 4) - current,
    );
    if (files.length > remaining) {
      setError(`Choose up to ${remaining} photos.`);
      return;
    }
    pickerLock.current = true;
    setPicking(true);
    setError("");
    try {
      for (const [index, file] of files.entries()) {
        setProgress(`Preparing photo ${index + 1} of ${files.length}…`);
        const image = await uploadProductImage(file, session);
        assertUserSession(session);
        if (colorIndex === undefined)
          setImages((previous) => [...previous, image]);
        else
          setColors((previous) =>
            previous.map((color, position) =>
              position === colorIndex
                ? { ...color, images: [...color.images, image] }
                : color,
            ),
          );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add photo.");
    } finally {
      pickerLock.current = false;
      setPicking(false);
      setProgress("");
    }
  }
  async function save() {
    if (lock.current || pickerLock.current) return;
    lock.current = true;
    setError("");
    try {
      const input = buildProduct(
        { fields, active, sizes, images, colors, quantities, creationKey },
        original,
      );
      await saveMutation.mutateAsync({ id: original?.id, input });
      router.push("/seller/products");
    } catch (cause) {
      const issues =
        isApiError(cause) && cause.issues
          ? Object.values(cause.issues).flat().slice(0, 3).join(" ")
          : "";
      setError(
        issues ||
          (cause instanceof Error ? cause.message : "Could not save product."),
      );
    } finally {
      lock.current = false;
    }
  }
  return {
    fields,
    setFields,
    active,
    setActive,
    sizes,
    images,
    setImages,
    colors,
    setColors,
    quantities,
    setQuantities,
    sizeMode,
    setSizeMode,
    customSize,
    setCustomSize,
    toggleSize,
    addCustomSize,
    error,
    progress,
    photoCount,
    photos,
    save,
    busy: picking || saveMutation.isPending,
  };
}
