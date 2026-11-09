"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { logoutSession } from "../../lib/auth/logout-session";
import { Button } from "../../components/ui";
import { LogOut } from "lucide-react";
export function LogoutButton({ className = "" }: { className?: string }) {
  const { setUser } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="secondary"
      className={className}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await logoutSession(() => setUser(null));
        } catch {
          /* Pending-logout recovery retries server revocation before another login. */
        } finally {
          router.replace("/login");
          setPending(false);
        }
      }}
    >
      <LogOut size={18} aria-hidden="true" />
      {pending ? "Signing out…" : "Log out"}
    </Button>
  );
}
