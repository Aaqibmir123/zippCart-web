"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { recoveryApi } from "./recovery-api";
import { Button, Card, Field, Heading, Notice } from "../../components/ui";
export function ForgotPasswordScreen() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const lock = useRef(false);
  useEffect(() => setReady(true), []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || lock.current) return;
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setMessage((await recoveryApi.request(phone)).message);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not request recovery.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-xl p-6 sm:py-16">
      <Heading
        title="Forgot password"
        description="Enter your workspace phone number. Recovery links go only to an independently verified recovery email."
      />
      <Card>
        <form onSubmit={submit} className="space-y-5">
          <Field
            label="Mobile Number"
            inputMode="tel"
            autoComplete="tel-national"
            pattern="[6-9][0-9]{9}"
            maxLength={10}
            required
            value={phone}
            onChange={(event) =>
              setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
            }
            disabled={!ready || busy}
          />
          {message && <Notice>{message}</Notice>}
          {error && <Notice error>{error}</Notice>}
          <Button type="submit" disabled={!ready || busy}>
            {busy ? "Requesting…" : "Send recovery link"}
          </Button>
        </form>
        <p className="mt-5 text-sm leading-6 text-slate-600">
          An unverified email cannot recover an account. If you have not
          enrolled a recovery email, contact the administrator for independently
          verified assistance.
        </p>
      </Card>
      <Link
        prefetch={false}
        href="/login"
        className="mt-6 inline-block font-semibold text-purple-800"
      >
        Back to login
      </Link>
    </main>
  );
}
