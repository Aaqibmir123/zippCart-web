"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "./auth-provider";
import { recoveryApi } from "./recovery-api";
import { clearSessionMayExist } from "../../lib/auth/session-storage";
import { Button, Card, Field, Heading, Notice } from "../../components/ui";

export function RecoveryLinkScreen({
  purpose,
}: {
  purpose: "verify" | "reset";
}) {
  const { setUser } = useAuth();
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const captured = useRef(false);
  const lock = useRef(false);
  useEffect(() => {
    if (captured.current) return;
    captured.current = true;
    const value =
      new URLSearchParams(location.hash.slice(1)).get("token") ?? "";
    // URL fragments are not sent to HTTP servers. Remove this one immediately;
    // never persist it in storage or include it in API response/log content.
    history.replaceState(null, "", location.pathname + location.search);
    if (/^[a-f0-9]{24}\.[a-f0-9]{64}$/.test(value)) setToken(value);
    else
      setError("This link is invalid. Open the latest link from your email.");
    setReady(true);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !token) return;
    const fields = new FormData(event.currentTarget as HTMLFormElement);
    const nextPassword = String(fields.get("newPassword") ?? "");
    const confirmPassword = String(fields.get("confirmPassword") ?? "");
    if (
      purpose === "reset" &&
      (nextPassword.length < 12 ||
        nextPassword.length > 128 ||
        nextPassword !== confirmPassword)
    ) {
      setError("Use 12–128 characters and confirm the new password exactly.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (purpose === "verify") await recoveryApi.verify(token);
      else {
        await recoveryApi.reset(token, nextPassword);
        await clearSessionMayExist().catch(() => undefined);
        setUser(null, false, "passwordChanged");
      }
      setComplete(true);
      setToken("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not use this link.",
      );
    } finally {
      setPassword("");
      setConfirmation("");
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-xl p-6 sm:py-16">
      <Heading
        title={
          purpose === "verify" ? "Verify recovery email" : "Reset password"
        }
        description={
          purpose === "verify"
            ? "Confirm this email as your password recovery channel. This does not sign you in."
            : "Choose a new workspace password. Every previous session will be signed out."
        }
      />
      <Card>
        {complete ? (
          <Notice>
            {purpose === "verify"
              ? "Recovery email verified. You can now use it for password recovery."
              : "Password reset. Sign in with your new password."}
          </Notice>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {purpose === "reset" && (
              <>
                <Field
                  label="New password"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  disabled={busy || !token}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Field
                  label="Confirm new password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  disabled={busy || !token}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </>
            )}
            {error && <Notice error>{error}</Notice>}
            <Button type="submit" disabled={!ready || !token || busy}>
              {busy
                ? "Saving…"
                : purpose === "verify"
                  ? "Confirm recovery email"
                  : "Reset password"}
            </Button>
          </form>
        )}
      </Card>
      <div className="mt-6 flex flex-wrap gap-5">
        <Link
          prefetch={false}
          href="/login"
          className="font-semibold text-purple-800"
        >
          Back to login
        </Link>
        <Link
          prefetch={false}
          href="/forgot-password"
          className="font-semibold text-purple-800"
        >
          Request another recovery link
        </Link>
      </div>
    </main>
  );
}
