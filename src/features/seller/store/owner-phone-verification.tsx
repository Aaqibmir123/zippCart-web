"use client";
import { useRef, useState } from "react";
import { storeApi } from "./store-api";
import { useCountdown } from "../../../lib/hooks/use-countdown";
import { Button, Card, Field, Notice } from "../../../components/ui";
export function OwnerPhoneVerification({
  phone,
  loginPhone,
  verified,
  onVerified,
}: {
  phone: string;
  loginPhone?: string;
  verified: boolean;
  onVerified: (proof: { phone: string; ownerPhoneProof: string }) => void;
}) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const seconds = useCountdown(resendAt, !verified);
  const lock = useRef(false);
  if (!/^[6-9]\d{9}$/.test(phone)) return null;
  if (verified)
    return (
      <Notice>
        {phone === loginPhone
          ? "Your login number is verified."
          : "Seller number verified."}
      </Notice>
    );
  async function run(check: boolean) {
    if (lock.current || (!check && Date.now() < resendAt)) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (check) onVerified(await storeApi.verifyOwnerOtp(phone, code));
      else {
        const receipt = await storeApi.requestOwnerOtp(phone);
        setMessage(receipt.message);
        setCode("");
        setResendAt(Date.now() + receipt.resendAfterSeconds * 1000);
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not verify phone.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Card>
      <h3 className="mb-3 font-bold">Verify seller number</h3>
      <p className="mb-4 text-sm">
        The store will belong to +91 {phone}. Your current login stays
        unchanged.
      </p>
      <Button
        variant="secondary"
        disabled={busy || seconds > 0}
        onClick={() => void run(false)}
      >
        {seconds > 0
          ? `Resend in ${seconds}s`
          : message
            ? "Resend OTP"
            : "Send OTP"}
      </Button>
      {message && (
        <div className="mt-4 space-y-4">
          <Notice>{message}</Notice>
          <Field
            label="Seller number OTP"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            disabled={busy}
          />
          <Button
            disabled={busy || code.length !== 6}
            onClick={() => void run(true)}
          >
            Verify number
          </Button>
        </div>
      )}
      {error && <Notice error>{error}</Notice>}
    </Card>
  );
}
