import { InventoryScreen } from "../../../../../features/seller/products/inventory-screen";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InventoryScreen id={id} />;
}
