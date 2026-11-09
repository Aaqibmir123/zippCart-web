import type { PropsWithChildren } from "react";
import { WorkspaceLayout } from "../../components/workspace-layout";
export default function AdminLayout({ children }: PropsWithChildren) {
  return <WorkspaceLayout role="admin">{children}</WorkspaceLayout>;
}
