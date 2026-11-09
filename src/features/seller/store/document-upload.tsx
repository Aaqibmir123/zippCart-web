"use client";
import { useState } from "react";
import { PhotoPicker } from "../../../components/photo-picker";
import { Button, Notice } from "../../../components/ui";
import { imageDataUrl, prepareImage } from "../../../lib/media/images";
import { assertUserSession } from "../../../lib/auth/session-scope";
import type { Attachment } from "./registration-model";
export function DocumentUpload({
  label,
  value,
  onChange,
  disabled,
  error,
}: {
  label: string;
  value: Attachment | null;
  onChange: (photo: Attachment | null) => void;
  disabled?: boolean;
  error?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  return (
    <div className="space-y-3 rounded-xl border border-purple-100 p-4">
      <h3 className="font-semibold">{label}</h3>
      {value?.uri && (
        <img
          src={value.uri}
          alt={`${label} preview`}
          className="max-h-52 w-full rounded-xl object-contain"
        />
      )}
      {value?.saved && (
        <p className="text-xs text-slate-500">
          Current document. Replace only if a correction is needed.
        </p>
      )}
      <PhotoPicker
        label={`${value ? "Replace" : "Add"} ${label}`}
        disabled={disabled || busy}
        onFiles={async (files, session) => {
          setBusy(true);
          setFailure("");
          try {
            const prepared = await prepareImage(files[0], 1600, 1048576, 0.8);
            const data = await imageDataUrl(prepared);
            assertUserSession(session);
            onChange({
              uri: data,
              name: files[0].name,
              mimeType: "image/jpeg",
            });
          } catch (cause) {
            setFailure(
              cause instanceof Error
                ? cause.message
                : "Could not prepare document.",
            );
          } finally {
            setBusy(false);
          }
        }}
      />
      {value && !value.saved && (
        <Button
          variant="secondary"
          disabled={disabled || busy}
          onClick={() => onChange(null)}
        >
          Remove {label}
        </Button>
      )}
      {(failure || error) && <Notice error>{failure || error}</Notice>}
    </div>
  );
}
