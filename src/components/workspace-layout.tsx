"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import {
  Bell,
  Headset,
  LayoutDashboard,
  Menu,
  Package,
  Settings2,
  ShoppingBasket,
  Star,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { SessionBoundary } from "../features/auth/session-boundary";
import { LogoutButton } from "../features/auth/logout-button";

const navigation = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Sellers", href: "/admin/sellers", icon: Users },
  { label: "Stores", href: "/admin/stores", icon: Store },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Shipping", href: "/admin/shipping", icon: ShoppingBasket },
  { label: "Support requests", href: "/admin/support", icon: Headset },
  { label: "Payouts & earnings", href: "/admin/earnings", icon: Wallet },
  { label: "Reviews", href: "/admin/reviews", icon: Star },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Admin Settings", href: "/admin/settings", icon: Settings2 },
];

function AdminNavigation({
  pathname,
  close,
}: {
  pathname: string;
  close: () => void;
}) {
  return (
    <nav aria-label="Admin dashboard" className="space-y-1.5">
      {navigation.map(({ label, href, icon: Icon }) => {
        const active =
          href === "/admin"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            onClick={close}
            aria-current={active ? "page" : undefined}
            className={`group flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors duration-150 ${active ? "bg-white text-purple-950 shadow-sm" : "text-purple-100/80 hover:bg-white/10 hover:text-white"}`}
          >
            <Icon
              size={18}
              strokeWidth={1.9}
              aria-hidden="true"
              className={
                active
                  ? "text-purple-700"
                  : "text-purple-200 group-hover:text-white"
              }
            />
            <span className="min-w-0 flex-1">{label}</span>
            {active && (
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-pink-500"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function AdminSidebarContent({ close }: { close: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-full flex-col">
      <Link
        href="/admin"
        prefetch={false}
        onClick={close}
        className="mb-7 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 text-white shadow-lg shadow-black/20">
          <LayoutDashboard size={21} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-lg font-black tracking-tight text-white">
            ZippCart<span className="text-orange-300">.</span>
          </span>
          <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[.2em] text-purple-200">
            Admin workspace
          </span>
        </span>
      </Link>
      <AdminNavigation pathname={pathname} close={close} />
      <div className="mt-auto border-t border-white/10 pt-5">
        <LogoutButton className="w-full justify-start border-white/10 bg-white/5 text-purple-50 hover:bg-white/10 hover:text-white" />
      </div>
    </div>
  );
}

export function WorkspaceLayout({
  role,
  children,
}: PropsWithChildren<{ role: "admin" }>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  function closeMenu(restoreFocus = false) {
    if (dialog.current?.open) dialog.current.close();
    setOpen(false);
    if (restoreFocus) menuTrigger.current?.focus();
  }
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  const section =
    navigation.find(({ href }) =>
      href === "/admin"
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`),
    )?.label ?? "Admin";

  return (
    <SessionBoundary role={role}>
      <div className="min-h-dvh bg-[#f7f5fb] lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside
          aria-label="Admin sidebar"
          className="sticky top-0 hidden h-dvh overflow-y-auto bg-[#241638] p-5 shadow-xl shadow-purple-950/10 lg:block"
        >
          <AdminSidebarContent close={() => undefined} />
        </aside>
        <header className="sticky top-0 z-20 flex min-w-0 items-center gap-3 border-b border-purple-100 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            ref={menuTrigger}
            type="button"
            aria-label="Open Admin menu"
            aria-expanded={open}
            aria-controls="admin-mobile-menu"
            onClick={() => setOpen(true)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-800 transition hover:bg-purple-100"
          >
            <Menu size={21} aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">
              {section}
            </p>
            <p className="text-[11px] font-medium text-purple-700">
              Admin workspace
            </p>
          </div>
          <LogoutButton className="shrink-0 border-transparent px-2.5 text-xs text-rose-700 hover:bg-rose-50" />
        </header>
        {open && (
          <dialog
            id="admin-mobile-menu"
            ref={dialog}
            aria-label="Admin menu"
            onCancel={(event) => {
              event.preventDefault();
              closeMenu(true);
            }}
            className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(20rem,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-r-3xl border-0 bg-[#241638] p-5 text-white shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm"
          >
            <div className="flex min-h-full flex-col pb-[env(safe-area-inset-bottom)]">
              <button
                type="button"
                aria-label="Close Admin menu"
                onClick={() => closeMenu(true)}
                className="mb-3 grid h-11 w-11 place-items-center self-end rounded-xl text-purple-100 transition hover:bg-white/10"
              >
                <X size={21} aria-hidden="true" />
              </button>
              <AdminSidebarContent close={() => closeMenu()} />
            </div>
          </dialog>
        )}
        <main className="min-w-0 px-4 py-5 sm:px-7 sm:py-8 lg:px-9 lg:py-9">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </SessionBoundary>
  );
}
