"use client";
import { useRef, useState } from "react";
import { Dialog } from "./dialog";
import { Button, Notice } from "./ui";

export function ConfirmButton({
  label,
  title,
  message,
  onConfirm,
  disabled,
  danger = false,
}: {
  label: string;
  title: string;
  message: string;
  onConfirm: () => Promise<unknown>;
  disabled?: boolean;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  return (
    <>
      <Button
        variant={danger ? "danger" : "primary"}
        disabled={disabled || busy}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        {label}
      </Button>
      {open && (
        <Dialog
          title={title}
          onClose={() => {
            if (!lock.current) setOpen(false);
          }}
        >
          <p className="mb-5 text-sm leading-6 text-slate-600">{message}</p>
          {error && <Notice error>{error}</Notice>}
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant={danger ? "danger" : "primary"}
              disabled={busy}
              onClick={async () => {
                if (lock.current) return;
                lock.current = true;
                setBusy(true);
                setError("");
                try {
                  await onConfirm();
                  setOpen(false);
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "The update failed. Please try again.",
                  );
                } finally {
                  lock.current = false;
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : label}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
