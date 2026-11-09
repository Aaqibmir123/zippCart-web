import { ProductEditor } from "../../../../../features/seller/products/product-editor";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductEditor id={id} />;
}
