import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import { Providers } from "../features/auth/providers";
export const metadata: Metadata = {
  title: "ZippCart Workspace",
  description: "ZippCart Admin and Seller workspace",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Suspense
          fallback={
            <p className="p-8" role="status">
              Loading workspace…
            </p>
          }
        >
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
