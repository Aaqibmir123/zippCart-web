import { CaseScreen } from "../../../../../features/admin/support/case-screen";
export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string; caseId: string }>;
}) {
  const { orderId, caseId } = await params;
  return <CaseScreen orderId={orderId} caseId={caseId} />;
}
