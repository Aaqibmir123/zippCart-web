import { SellerOrderDetail } from "../../../../features/seller/orders/order-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SellerOrderDetail id={id} />;
}
