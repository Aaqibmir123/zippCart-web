import { AdminOrderDetailScreen } from "../../../../features/admin/shipping/order-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminOrderDetailScreen id={id} />;
}
