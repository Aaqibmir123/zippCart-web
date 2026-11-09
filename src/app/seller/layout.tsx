import type { PropsWithChildren } from "react";
import { SellerWorkspace } from "../../features/seller/layout/seller-workspace";
export default function SellerLayout({ children }: PropsWithChildren) {
  return <SellerWorkspace>{children}</SellerWorkspace>;
}
