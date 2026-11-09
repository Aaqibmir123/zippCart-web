"use client";
import { useEffect, useRef, type PropsWithChildren } from "react";
import { Button } from "./ui";

export function Dialog({
  title,
  children,
  onClose,
}: PropsWithChildren<{ title: string; onClose: () => void }>) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[90dvh] w-[min(94vw,56rem)] overflow-auto rounded-2xl border-0 bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 sm:p-8"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
      {children}
    </dialog>
  );
}
