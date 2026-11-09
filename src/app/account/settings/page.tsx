import { PasswordSettings } from "../../../features/auth/password-settings";
import { RecoveryEmailSettings } from "../../../features/auth/recovery-email-settings";
import { SessionBoundary } from "../../../features/auth/session-boundary";
import { LogoutButton } from "../../../features/auth/logout-button";
import Link from "next/link";
export default function AccountSettingsPage() {
  return (
    <SessionBoundary role="account">
      <main className="mx-auto max-w-3xl space-y-10 p-5 sm:p-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            prefetch={false}
            href="/login"
            className="font-bold text-purple-800"
          >
            Your workspace
          </Link>
          <LogoutButton />
        </div>
        <RecoveryEmailSettings />
        <PasswordSettings />
      </main>
    </SessionBoundary>
  );
}
