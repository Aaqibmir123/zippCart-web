"use client";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { supportApi } from "./support-api";
import {
  assertUserSession,
  type SessionScope,
} from "../../../lib/auth/session-scope";
import { prepareImage, imageDataUrl } from "../../../lib/media/images";
import { isApiError } from "../../../lib/api/api-error";
import { PhotoPicker } from "../../../components/photo-picker";
import { Dialog } from "../../../components/dialog";
import { Button, Notice, QueryState } from "../../../components/ui";
function EvidencePhoto({ orderId, id }: { orderId: string; id: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["return-photo", user?.id, orderId, id],
    queryFn: () => supportApi.photo(orderId, id),
    gcTime: 0,
  });
  return (
    <>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && (
        <button aria-label="View proof photo" onClick={() => setOpen(true)}>
          <img
            src={query.data.data}
            alt="Proof photo"
            className="h-24 w-24 rounded-xl object-cover"
          />
        </button>
      )}
      {open && query.data && (
        <Dialog title="Proof photo" onClose={() => setOpen(false)}>
          <img
            src={query.data.data}
            alt="Proof photo"
            className="max-h-[70dvh] w-full object-contain"
          />
        </Dialog>
      )}
    </>
  );
}
export function EvidencePhotos({
  orderId,
  ids,
  onChange,
  disabled,
  onBusy,
}: {
  orderId: string;
  ids: string[];
  onChange?: (ids: string[]) => void;
  disabled?: boolean;
  onBusy?: (busy: boolean) => void;
}) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(files: File[], session: SessionScope) {
    if (lock.current || disabled || ids.length >= 5) return;
    lock.current = true;
    setBusy(true);
    onBusy?.(true);
    setError("");
    try {
      assertUserSession(session);
      const blob = await prepareImage(files[0]);
      assertUserSession(session);
      let response;
      try {
        response = await supportApi.uploadBinary(orderId, blob);
      } catch (cause) {
        assertUserSession(session);
        if (
          !isApiError(cause) ||
          (cause.status !== 404 && cause.code !== "IMAGE_UPLOADS_DISABLED")
        )
          throw cause;
        response = await supportApi.upload(orderId, await imageDataUrl(blob));
      }
      assertUserSession(session);
      onChange?.([...new Set([...ids, response.id])]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not upload photo.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy?.(false);
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {ids.map((id) => (
          <div key={id} className="space-y-2">
            <EvidencePhoto orderId={orderId} id={id} />
            {onChange && (
              <Button
                variant="secondary"
                disabled={busy || disabled}
                onClick={() => onChange(ids.filter((value) => value !== id))}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>
      {onChange && ids.length < 5 && (
        <div className="flex flex-wrap gap-3">
          <PhotoPicker
            label="Take photo"
            capture
            disabled={busy || disabled}
            onFiles={upload}
          />
          <PhotoPicker
            label="Choose photo"
            disabled={busy || disabled}
            onFiles={upload}
          />
        </div>
      )}
      {busy && (
        <p role="status" className="text-sm">
          Uploading photo…
        </p>
      )}
      {error && <Notice error>{error}</Notice>}
    </div>
  );
}
