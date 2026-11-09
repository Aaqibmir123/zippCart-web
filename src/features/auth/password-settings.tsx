"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { authApi } from "../../lib/api/auth-api";
import { clearSessionMayExist } from "../../lib/auth/session-storage";
import { Button, Card, Field, Heading, Notice } from "../../components/ui";

export function PasswordSettings() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const lock = useRef(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const fields = new FormData(event.currentTarget as HTMLFormElement);
    const currentValue = String(fields.get("currentPassword") ?? "");
    const nextValue = String(fields.get("newPassword") ?? "");
    const confirmation = String(fields.get("confirmPassword") ?? "");
    if (
      nextValue.length < 12 ||
      nextValue.length > 128 ||
      nextValue !== confirmation ||
      nextValue === currentValue
    ) {
      setError(
        "Choose a different password of 12–128 characters and confirm it exactly.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await authApi.changePassword(currentValue, nextValue);
      setNext("");
      setConfirm("");
      await clearSessionMayExist().catch(() => undefined);
      setUser(null, false, "passwordChanged");
      router.replace("/login?passwordChanged=1");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not change password.",
      );
    } finally {
      setCurrent("");
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        title={
          user?.passwordChangeRequired
            ? "Set your own password"
            : "Change password"
        }
        description={
          user?.passwordChangeRequired
            ? "Replace your temporary password before opening the workspace. Saving signs out all sessions."
            : "Enter your current password. Saving signs out every existing session; sign in again with your new password."
        }
      />
      <Card className="max-w-xl">
        <form className="space-y-5" onSubmit={submit}>
          <Field
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            maxLength={128}
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            disabled={busy}
          />
          <Field
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={next}
            onChange={(event) => setNext(event.target.value)}
            disabled={busy}
          />
          <Field
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            disabled={busy}
          />
          {error && <Notice error>{error}</Notice>}
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </Button>
        </form>
      </Card>
    </>
  );
}
