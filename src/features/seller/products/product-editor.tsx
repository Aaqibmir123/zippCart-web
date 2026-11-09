"use client";
import { useAuth } from "../../auth/auth-provider";
import { useSellerProduct } from "./use-products";
import { ProductForm } from "./product-form";
import { Notice, QueryState } from "../../../components/ui";
import { ProductPreview } from "../../../components/product-preview";
export function ProductEditor({ id }: { id?: string }) {
  const { user } = useAuth();
  const query = useSellerProduct(user?.id, id);
  const readOnly = user?.reviewer === true && !user.reviewerFullAccess;
  if (!id)
    return readOnly ? (
      <Notice>Product changes are unavailable in reviewer access.</Notice>
    ) : (
      <ProductForm />
    );
  if (!query.data)
    return (
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  if (readOnly)
    return (
      <ProductPreview title="Product details" product={query.data.product} />
    );
  return <ProductForm key={id} product={query.data.product} />;
}
