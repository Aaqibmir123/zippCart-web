import { StoreDetail } from "../../../../features/admin/stores/store-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StoreDetail id={id} />;
}
