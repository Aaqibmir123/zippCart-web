import { PasswordSettings } from "../../../features/auth/password-settings";
import { RecoveryEmailSettings } from "../../../features/auth/recovery-email-settings";
export default function SellerSettingsPage() {
  return (
    <div className="space-y-10">
      <PasswordSettings />
      <RecoveryEmailSettings />
    </div>
  );
}
