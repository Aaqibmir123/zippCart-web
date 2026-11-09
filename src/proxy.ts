import { NextRequest, NextResponse } from "next/server";
import { serverApiRoot } from "./lib/api/config";

export async function proxy(request: NextRequest) {
  if (!/^\/(admin|seller|account)(\/|$)/.test(request.nextUrl.pathname))
    return NextResponse.next();
  const token = request.cookies.get("accessToken")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));
  try {
    const root = serverApiRoot(
      process.env.NEXT_PUBLIC_API_URL,
      process.env.ZIPPCART_API_ORIGIN,
    );
    if (!root) throw new Error("API not configured");
    // The backend verifies the signed cookie, live session and current roles.
    // Next never decodes a cookie into a locally trusted Admin identity.
    const response = await fetch(`${root}/auth/me`, {
      headers: { Cookie: `accessToken=${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401)
      return NextResponse.redirect(new URL("/login", request.url));
    if (!response.ok) throw new Error("Account verification failed");
    const { user } = await response.json();
    if (user?.authMethod !== "password")
      return NextResponse.redirect(new URL("/login", request.url));
    const admin = Array.isArray(user?.roles) && user.roles.includes("admin");
    const seller =
      Array.isArray(user?.roles) &&
      user.roles.includes("seller") &&
      user.storeStatus === "approved" &&
      user.isActive === true;
    const path = request.nextUrl.pathname;
    if (user.passwordChangeRequired && path !== "/account/password")
      return NextResponse.redirect(new URL("/account/password", request.url));
    if (
      (path.startsWith("/admin") &&
        (!admin || (path.startsWith("/admin/settings") && user.reviewer))) ||
      (path.startsWith("/seller") &&
        path !== "/seller/application" &&
        !path.startsWith("/seller/application/") &&
        !seller)
    ) {
      return new NextResponse(
        '<!doctype html><html lang="en"><title>Access denied</title><h1>Workspace access unavailable</h1><p>Your account does not have permission for this workspace.</p><a href="/login">Return to sign-in</a></html>',
        {
          status: 403,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }
    const next = NextResponse.next();
    next.headers.set("Cache-Control", "no-store");
    return next;
  } catch {
    return new NextResponse(
      "Your session could not be verified. Check the local backend and try again.",
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
export const config = {
  matcher: [
    "/",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/admin/:path*",
    "/seller/:path*",
    "/account/:path*",
  ],
};
