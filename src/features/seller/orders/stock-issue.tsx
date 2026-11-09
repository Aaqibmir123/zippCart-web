"use client";
import { useRef, useState } from "react";
import { sellerOrderApi, type SellerOrder } from "./orders-api";
import { Button, Card, Notice, TextArea } from "../../../components/ui";
export function StockIssue({
  order,
  refresh,
}: {
  order: SellerOrder;
  refresh: () => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  if (
    !["placed", "preparing", "packed", "ready_for_dispatch"].includes(
      order.status,
    )
  )
    return null;
  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold">Report stock issue</h2>
      {order.stockIssue?.open ? (
        <Notice error>
          {order.stockIssue.note} · Admin has been alerted. The order remains
          active.
        </Notice>
      ) : (
        <div className="space-y-4">
          <p className="text-sm">
            Tell Admin which item cannot be fulfilled. Reporting keeps the order
            safe while the issue is reviewed.
          </p>
          <TextArea
            label="Stock issue details"
            value={note}
            onChange={setNote}
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
                await sellerOrderApi.reportStockIssue(order.id, note.trim());
                await refresh();
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not report issue.",
                );
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            Report to admin
          </Button>
          {error && <Notice error>{error}</Notice>}
        </div>
      )}
    </Card>
  );
}
