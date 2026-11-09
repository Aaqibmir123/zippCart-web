import { LabelScreen } from "../../../../../features/admin/shipping/label-screen";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LabelScreen id={id} />;
}
