"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { earningsApi } from "./earnings-api";
import {
  usePayoutAccount,
  type StoreEarning,
} from "../../../lib/earnings/earnings-api";
import { cash } from "../../../lib/earnings/payout-format";
import { AccountDetails } from "../../../components/earnings-statement";
import { Dialog } from "../../../components/dialog";
import { Check, Field, Notice, QueryState } from "../../../components/ui";
import { ConfirmButton } from "../../../components/confirm-button";
export type PaymentTarget = { store: StoreEarning } | { orderId: string };
export function RecordPayment({
  target,
  close,
}: {
  target: PaymentTarget;
  close: () => void;
}) {
  const payout = "store" in target;
  const account = usePayoutAccount(
    true,
    payout ? target.store.storeId : undefined,
  );
  const client = useQueryClient();
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState(
    payout ? (target.store.availablePaise / 100).toFixed(2) : "",
  );
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  const amountPaise = Math.round(Number(amount) * 100);
  const validAmount =
    /^\d+(\.\d{1,2})?$/.test(amount) &&
    Number.isSafeInteger(amountPaise) &&
    amountPaise > 0 &&
    (!payout || amountPaise <= target.store.availablePaise);
  return (
    <Dialog
      title={payout ? "Record seller payout" : "Verify customer payment"}
      onClose={() => {
        if (!busy) close();
      }}
    >
      <div className="space-y-5">
        <p className="font-semibold">
          {payout
            ? `${target.store.name} · Ready ${cash(target.store.availablePaise)}`
            : `Order #${target.orderId.slice(-8).toUpperCase()}`}
        </p>
        {payout && (
          <>
            <QueryState
              pending={account.isPending}
              error={account.error}
              retry={() => void account.refetch()}
            />
            {account.data?.account && (
              <AccountDetails account={account.data.account} />
            )}
            <Field
              label="Payout amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={busy}
            />
            {!validAmount && (
              <Notice error>
                Enter an amount up to {cash(target.store.availablePaise)}.
              </Notice>
            )}
          </>
        )}
        <Field
          label="Transaction reference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          maxLength={100}
          disabled={busy}
        />
        <Check
          label={
            payout
              ? "I transferred this amount to the saved account."
              : "The full customer payment has been collected."
          }
          checked={confirmed}
          onChange={setConfirmed}
          disabled={busy}
        />
        <Notice>This saves a record; it does not transfer money.</Notice>
        <ConfirmButton
          label="Confirm record"
          title={
            payout
              ? `Record ${cash(amountPaise)} payout?`
              : "Verify collected payment?"
          }
          message={
            payout
              ? `${target.store.name} · ${reference.trim()}. Record the completed transfer.`
              : "Mark the full customer payment as collected."
          }
          disabled={
            busy ||
            !confirmed ||
            reference.trim().length < 6 ||
            (payout &&
              (!validAmount ||
                !account.data?.account ||
                account.isFetching ||
                account.isError))
          }
          onConfirm={async () => {
            setBusy(true);
            try {
              if (payout && account.data?.account)
                await earningsApi.payout(target.store.storeId, {
                  clientKey: key.current,
                  reference: reference.trim(),
                  method: account.data.account.method,
                  amountPaise,
                  transferConfirmed: true,
                });
              else if ("orderId" in target)
                await earningsApi.collect(target.orderId, reference.trim());
              await Promise.all(
                [
                  "earnings",
                  "admin-analytics",
                  "admin-shipping-all",
                  "admin-shipping-detail",
                ].map((name) => client.invalidateQueries({ queryKey: [name] })),
              );
              close();
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </Dialog>
  );
}
