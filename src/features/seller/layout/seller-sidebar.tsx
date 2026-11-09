"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronRight,
  House,
  Menu,
  Package,
  Settings2,
  ShoppingBag,
  Star,
  Store,
  Wallet,
  X,
} from "lucide-react";
import { LogoutButton } from "../../auth/logout-button";

const navigation = [
  { label: "Home", href: "/seller", icon: House },
  { label: "Orders", href: "/seller/orders", icon: ShoppingBag },
  { label: "Products", href: "/seller/products", icon: Package },
  { label: "Payouts & earnings", href: "/seller/earnings", icon: Wallet },
  { label: "Reviews", href: "/seller/reviews", icon: Star },
  { label: "Notifications", href: "/seller/notifications", icon: Bell },
  { label: "Store details", href: "/seller/store", icon: Store },
  { label: "Account settings", href: "/seller/settings", icon: Settings2 },
];

export function SellerSidebar({
  storeName,
  category,
  application,
}: {
  storeName?: string;
  category?: string;
  application: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  function closeMenu(restoreFocus = false) {
    if (drawer.current?.open) drawer.current.close();
    setOpen(false);
    if (restoreFocus) menuTrigger.current?.focus();
  }
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const element = drawer.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const content = (
    <>
      <Link
        href={application ? "/seller/application" : "/seller"}
        prefetch={false}
        onClick={() => setOpen(false)}
        className="mb-7 flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 text-white shadow-lg shadow-black/20">
          <Store size={24} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block break-words text-base font-bold leading-6 tracking-tight text-white">
            {storeName || "Your store"}
          </span>
          {category && (
            <span className="mt-0.5 block truncate text-xs font-medium text-purple-200">
              {category}
            </span>
          )}
        </span>
      </Link>
      <nav aria-label="seller dashboard" className="space-y-1.5">
        {navigation.map(({ label, href: destination, icon: Icon }, index) => {
          const href =
            application && destination === "/seller/settings"
              ? "/account/settings"
              : destination;
          const active =
            href === "/seller"
              ? pathname === href
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <div
              key={href}
              className={
                index === 5 ? "mt-5 border-t border-white/10 pt-5" : undefined
              }
            >
              <Link
                href={href}
                prefetch={false}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors duration-150 ${active ? "bg-white text-purple-950 shadow-sm" : "text-purple-100/80 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon
                  size={20}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className={
                    active
                      ? "text-purple-700"
                      : "text-purple-200 group-hover:text-white"
                  }
                />
                <span className="flex-1">{label}</span>
                {active && (
                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className="text-pink-500"
                  />
                )}
              </Link>
            </div>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/10 pt-5">
        <LogoutButton className="w-full justify-start border-white/10 bg-white/5 text-purple-50 hover:bg-white/10 hover:text-white" />
      </div>
    </>
  );
  return (
    <>
      <aside
        aria-label="Seller sidebar"
        className="sticky top-0 hidden h-dvh flex-col gap-5 overflow-y-auto border-r border-purple-950/10 bg-[#241638] p-5 shadow-xl shadow-purple-950/10 lg:flex"
      >
        {content}
      </aside>
      <header className="sticky top-0 z-20 flex min-w-0 items-center gap-3 border-b border-purple-100 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          ref={menuTrigger}
          type="button"
          aria-label="Open seller menu"
          aria-expanded={open}
          aria-controls="seller-mobile-menu"
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">
          {storeName || "Your store"}
        </span>
        <LogoutButton className="shrink-0 border-transparent px-2.5 text-xs text-rose-700 hover:bg-rose-50" />
      </header>
      {open && (
        <dialog
          id="seller-mobile-menu"
          ref={drawer}
          aria-label="Seller menu"
          onCancel={(event) => {
            event.preventDefault();
            closeMenu(true);
          }}
          className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(20rem,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-r-3xl border-0 bg-[#241638] p-5 text-white shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm"
        >
          <div className="flex min-h-full flex-col gap-5 pb-[env(safe-area-inset-bottom)]">
            <button
              type="button"
              aria-label="Close seller menu"
              onClick={() => closeMenu(true)}
              className="-mb-3 flex h-11 w-11 items-center justify-center self-end rounded-xl text-purple-100 hover:bg-white/10"
            >
              <X size={22} aria-hidden="true" />
            </button>
            {content}
          </div>
        </dialog>
      )}
    </>
  );
}
