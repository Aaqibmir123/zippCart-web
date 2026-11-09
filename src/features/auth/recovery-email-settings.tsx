"use client";
import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth-provider";
import { recoveryApi, deliveryMessage } from "./recovery-api";
import {
  Button,
  Card,
  Field,
  Heading,
  Notice,
  QueryState,
} from "../../components/ui";
export function RecoveryEmailSettings() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["recovery-email", user?.id],
    queryFn: recoveryApi.settings,
    gcTime: 0,
    retry: false,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const fields = new FormData(event.currentTarget as HTMLFormElement);
    const currentPassword = String(fields.get("currentPassword") ?? "");
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await recoveryApi.enroll(
        email.trim().toLowerCase(),
        currentPassword,
      );
      setMessage(deliveryMessage(result.delivery));
      await query.refetch();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update recovery email.",
      );
    } finally {
      setPassword("");
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section>
      <Heading
        title="Recovery email"
        description="Recover your password through a verified email address. Login always uses your phone number and password."
      />
      <Card className="max-w-xl">
        <QueryState
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
        {query.data && (
          <div className="mb-5 space-y-3">
            <p className="break-all text-sm">
              {query.data.email || "No recovery email saved"} ·{" "}
              {query.data.verified ? "Verified" : "Not verified"}
            </p>
            {query.data.pendingEmail && (
              <Notice>
                Awaiting verification: {query.data.pendingEmail}. Only the
                latest verification link is valid.
              </Notice>
            )}
            {!query.data.deliveryAvailable && (
              <Notice error>
                Email delivery is not configured. An unverified address cannot
                recover your password.
              </Notice>
            )}
          </div>
        )}
        <form onSubmit={submit} className="space-y-5">
          <Field
            label="Recovery email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
          <Field
            label="Current password for email verification"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            minLength={8}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
          />
          {error && <Notice error>{error}</Notice>}
          {message && <Notice>{message}</Notice>}
          <Button
            disabled={busy || query.isPending || query.isError}
            type="submit"
          >
            {busy ? "Saving…" : "Save email & send verification"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
