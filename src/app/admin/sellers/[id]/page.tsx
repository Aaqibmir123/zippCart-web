import { SellerDetail } from "../../../../features/admin/sellers/seller-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SellerDetail id={id} />;
}
