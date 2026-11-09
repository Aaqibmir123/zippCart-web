"use client";
import { useEffect, type PropsWithChildren } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "./auth-provider";
import { Button, Card } from "../../components/ui";

function SessionPending({
  role,
  authenticated = false,
}: {
  role: "admin" | "seller" | "login" | "account";
  authenticated?: boolean;
}) {
  const workspace = role === "admin" || role === "seller";
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label="Verifying your ZippCart session"
      className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_#f1eaff,_#f8f7fb_48%,_#f4f5f9)] px-4 py-6 sm:px-8 sm:py-9"
    >
      <span className="sr-only">Verifying your session...</span>
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-7xl flex-col">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-purple-700 to-pink-500 text-white shadow-md shadow-purple-200">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <span className="text-lg font-black tracking-tight text-slate-900">
            ZippCart<span className="text-pink-500">.</span>
          </span>
        </div>
        {workspace ? (
          <div className="mt-8 grid flex-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <aside
              aria-hidden="true"
              className="hidden rounded-3xl border border-purple-100 bg-white/80 p-5 shadow-sm lg:block"
            >
              <div className="h-12 animate-pulse rounded-2xl bg-purple-100/80" />
              <div className="mt-8 space-y-3">
                {Array.from(
                  { length: role === "admin" ? 8 : 6 },
                  (_, index) => (
                    <div
                      key={index}
                      className={`h-11 animate-pulse rounded-xl ${index === 0 ? "bg-purple-100" : "bg-slate-100"}`}
                    />
                  ),
                )}
              </div>
            </aside>
            <section
              aria-hidden="true"
              className="min-w-0 rounded-3xl border border-white bg-white/75 p-5 shadow-sm backdrop-blur sm:p-8"
            >
              <div className="flex items-center gap-3 text-sm font-semibold text-purple-800">
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  size={18}
                  aria-hidden="true"
                />
                Securing your {role} workspace...
              </div>
              <div className="mt-7 h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
              <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" />
              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
                  />
                ))}
              </div>
              <div className="mt-6 h-52 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
            </section>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center py-12">
            <div className="rounded-3xl border border-white bg-white/85 px-8 py-9 text-center shadow-xl shadow-purple-950/5 backdrop-blur sm:px-12">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-purple-50 text-purple-700">
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  size={26}
                  aria-hidden="true"
                />
              </span>
              <p className="mt-5 text-lg font-bold text-slate-900">
                {authenticated
                  ? "Opening your workspace"
                  : "Verifying your session"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {authenticated
                  ? "You are signed in. Taking you to your dashboard."
                  : "Checking your secure sign-in with ZippCart."}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function SessionIssue({
  retry,
  title = "We couldn't verify this session",
  description = "Your workspace is still protected. Check your connection and try again; you will stay on this page.",
  action = "Try again",
}: {
  retry: () => void;
  title?: string;
  description?: string;
  action?: string;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,_#f1eaff,_#f8f7fb_55%)] px-4 py-10">
      <Card className="w-full max-w-md border-white p-7 text-center shadow-xl shadow-purple-950/5 sm:p-9">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-700">
          <AlertCircle size={23} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <Button className="mt-6 w-full" onClick={retry}>
          <RotateCcw size={16} aria-hidden="true" />
          {action}
        </Button>
      </Card>
    </main>
  );
}

export function SessionBoundary({
  role,
  children,
}: PropsWithChildren<{ role: "admin" | "seller" | "login" | "account" }>) {
  const {
    user,
    isRestoringSession,
    sessionRestoreIssue,
    retrySessionRestore,
    loginReason,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const admin = user?.roles?.includes("admin");
  const seller =
    user?.roles?.includes("seller") &&
    user.storeStatus === "approved" &&
    user.isActive;
  useEffect(() => {
    if (isRestoringSession || sessionRestoreIssue) return;
    if (!user && role !== "login")
      router.replace(
        loginReason === "passwordChanged"
          ? "/login?passwordChanged=1"
          : "/login",
      );
    if (user?.passwordChangeRequired && pathname !== "/account/password")
      router.replace("/account/password");
    else if (user?.authMethod === "password" && role === "login")
      router.replace(
        admin ? "/admin" : seller ? "/seller" : "/seller/application",
      );
  }, [
    user,
    role,
    admin,
    seller,
    router,
    isRestoringSession,
    sessionRestoreIssue,
    loginReason,
    pathname,
  ]);
  if (isRestoringSession) return <SessionPending role={role} />;
  if (sessionRestoreIssue) return <SessionIssue retry={retrySessionRestore} />;
  if (role === "login")
    return user?.authMethod === "password" ? (
      <SessionPending role={role} authenticated />
    ) : (
      children
    );
  if (!user) return <SessionPending role={role} />;
  if (user.passwordChangeRequired && pathname !== "/account/password")
    return <SessionPending role={role} />;
  if (
    (role === "admin" && !admin) ||
    (role === "seller" &&
      !pathname.startsWith("/seller/application") &&
      !seller)
  )
    return (
      <SessionIssue
        retry={() => router.replace("/login")}
        title="Workspace access unavailable"
        description="An approved, active store is required for Seller access. Contact an administrator if you think this is a mistake."
        action="Return to login"
      />
    );
  return children;
}
