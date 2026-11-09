"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminShippingApi } from "./shipping-api";
import { Button, Field, Notice } from "../../../components/ui";
export function ResolveIssue({
  orderId,
  issue,
}: {
  orderId: string;
  issue: { storeId: string; note: string };
}) {
  const client = useQueryClient();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  return (
    <div className="mt-4 space-y-3 rounded-xl bg-orange-50 p-4">
      <p className="text-sm">{issue.note}</p>
      <Field
        label="Stock issue resolution"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={500}
        disabled={busy}
      />
      <Button
        disabled={busy || note.trim().length < 5}
        onClick={async () => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError("");
          try {
            await adminShippingApi.resolve(orderId, issue.storeId, note.trim());
            await Promise.all(
              [
                "admin-shipping-all",
                "admin-shipping-ready",
                "shipping-operations",
                "admin-shipping-detail",
              ].map((key) => client.invalidateQueries({ queryKey: [key] })),
            );
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Could not resolve issue.",
            );
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        Resolve issue
      </Button>
      {error && <Notice error>{error}</Notice>}
    </div>
  );
}
