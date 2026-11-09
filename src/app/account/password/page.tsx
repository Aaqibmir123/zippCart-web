import { PasswordSettings } from "../../../features/auth/password-settings";
import { SessionBoundary } from "../../../features/auth/session-boundary";
import { LogoutButton } from "../../../features/auth/logout-button";
export default function RequiredPasswordPage() {
  return (
    <SessionBoundary role="account">
      <main className="mx-auto max-w-2xl p-5 sm:p-10">
        <div className="mb-8 flex items-center justify-between">
          <span className="text-2xl font-black text-purple-800">ZippCart.</span>
          <LogoutButton />
        </div>
        <PasswordSettings />
      </main>
    </SessionBoundary>
  );
}
