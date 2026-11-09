"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  closedStatuses,
  requestKey,
  type ReturnCase,
} from "../../../lib/contracts/returns";
import { supportApi } from "./support-api";
import { EvidencePhotos } from "./evidence-photos";
import { eventLabels } from "./support-model";
import { Button, Card, Notice, TextArea } from "../../../components/ui";
export function Conversation({
  record,
  refresh,
  active,
}: {
  record: ReturnCase;
  refresh: () => Promise<void>;
  active: boolean;
}) {
  const client = useQueryClient();
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [attach, setAttach] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const key = useRef(requestKey());
  const fingerprint = useRef("");
  const lock = useRef(false);
  const latest = useRef<HTMLDivElement>(null);
  const seen = useMutation({
    mutationFn: () => supportApi.read(record),
    retry: 1,
    onSuccess: () => client.invalidateQueries({ queryKey: ["return-admin"] }),
  });
  const markRead = seen.mutate;
  useEffect(() => {
    if (active && record.unread) markRead();
  }, [active, record.id, record.version, record.unread, markRead]);
  const closed = closedStatuses.includes(record.status);
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={() =>
            latest.current?.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            })
          }
        >
          Jump to latest
        </Button>
      </div>
      {record.history.map((event) => (
        <Card
          key={event.id}
          className={
            event.actor === "admin" ? "border-purple-200 bg-purple-50/30" : ""
          }
        >
          <p className="text-sm font-bold">
            {eventLabels[event.action] ?? event.action} ·{" "}
            {event.actor === "admin" ? "You" : "Customer"}
          </p>
          <p className="my-3 whitespace-pre-wrap text-sm leading-7">
            {event.note}
          </p>
          {!!event.photoIds.length && (
            <EvidencePhotos orderId={record.orderId} ids={event.photoIds} />
          )}
          <p className="mt-3 text-xs text-slate-500">
            {new Date(event.at).toLocaleString("en-IN")}
          </p>
        </Card>
      ))}
      <div ref={latest} />
      {seen.isError && (
        <Button variant="secondary" onClick={() => markRead()}>
          Could not mark read. Retry
        </Button>
      )}
      {closed ? (
        <Notice>
          This request is closed. The conversation and history are saved here.
        </Notice>
      ) : (
        <Card>
          <div className="space-y-4">
            <TextArea
              label="Message to customer"
              value={note}
              onChange={setNote}
              maxLength={1000}
              disabled={busy}
            />
            <Button
              variant="secondary"
              disabled={busy || photoBusy}
              onClick={() => setAttach(!attach)}
            >
              {attach ? "Hide photo attachments" : "Attach photos"}
            </Button>
            {attach && (
              <EvidencePhotos
                orderId={record.orderId}
                ids={photos}
                onChange={setPhotos}
                onBusy={setPhotoBusy}
                disabled={busy}
              />
            )}
            {error && <Notice error>{error}</Notice>}
            <Button
              disabled={busy || photoBusy || note.trim().length < 3}
              onClick={async () => {
                if (lock.current) return;
                lock.current = true;
                setBusy(true);
                setError("");
                const current = JSON.stringify({ note: note.trim(), photos });
                if (fingerprint.current && fingerprint.current !== current)
                  key.current = requestKey();
                fingerprint.current = current;
                try {
                  await supportApi.action(record, {
                    action: "message",
                    note: note.trim(),
                    photoIds: photos,
                    version: record.version,
                    clientKey: key.current,
                  });
                  key.current = requestKey();
                  fingerprint.current = "";
                  setNote("");
                  setPhotos([]);
                  setAttach(false);
                  await refresh();
                  latest.current?.scrollIntoView({ block: "nearest" });
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Could not send message.",
                  );
                } finally {
                  lock.current = false;
                  setBusy(false);
                }
              }}
            >
              Send message
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
