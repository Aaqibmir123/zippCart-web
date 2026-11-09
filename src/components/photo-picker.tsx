"use client";
import { useRef } from "react";
import {
  getSessionScope,
  assertUserSession,
  type SessionScope,
} from "../lib/auth/session-scope";
export function PhotoPicker({
  label,
  onFiles,
  multiple = false,
  disabled = false,
  capture = false,
}: {
  label: string;
  onFiles: (files: File[], session: SessionScope) => Promise<void>;
  multiple?: boolean;
  disabled?: boolean;
  capture?: boolean;
}) {
  const scope = useRef<SessionScope | null>(null);
  return (
    <label
      className={`inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-800 ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      {label}
      <input
        aria-label={label}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        capture={capture ? "environment" : undefined}
        disabled={disabled}
        className="sr-only"
        onClick={() => {
          scope.current = getSessionScope();
        }}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (!files.length || !scope.current) return;
          try {
            assertUserSession(scope.current);
            void onFiles(files, scope.current);
          } catch {
            /* The owning form handles session changes. */
          }
        }}
      />
    </label>
  );
}
