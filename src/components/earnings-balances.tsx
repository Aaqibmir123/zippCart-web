import type { Statement } from "../lib/earnings/earnings-api";
import { cash } from "../lib/earnings/payout-format";
import {
  releaseLabel,
  settlementOptions,
} from "../lib/earnings/settlement-model";
import { Card, Details } from "./ui";

export function BalanceSummary({
  data,
  admin = false,
}: {
  data: Statement;
  admin?: boolean;
}) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Ready for payout</p>
          <p className="mt-3 text-3xl font-bold">{cash(data.payablePaise)}</p>
          <p className="mt-3 text-xs leading-6">
            Clears 24 hours after customer receipt, once returns and collection
            are resolved.
          </p>
          {data.nextReleaseAt && (
            <p className="mt-3 text-xs">
              Next window ends {releaseLabel(data.nextReleaseAt)}
            </p>
          )}
        </Card>
        <Card>
          <p className="text-sm text-slate-500">On hold / upcoming</p>
          <p className="mt-3 text-3xl font-bold">
            {cash(data.stores.reduce((sum, store) => sum + store.heldPaise, 0))}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">
            {admin ? "Total paid to sellers" : "Total received"}
          </p>
          <p className="mt-3 text-3xl font-bold">{cash(data.paidPaise)}</p>
        </Card>
      </div>
      {admin && (
        <Card>
          <Details
            values={{
              "Cleared commission": cash(data.holds.cleared.commissionPaise),
              "Pending commission": cash(
                Object.entries(data.holds).reduce(
                  (sum, [key, value]) =>
                    sum + (key === "cleared" ? 0 : value.commissionPaise),
                  0,
                ),
              ),
              "Verified collections (net refunds)": cash(
                Object.values(data.holds).reduce(
                  (sum, value) => sum + value.collectedPaise,
                  0,
                ),
              ),
            }}
          />
        </Card>
      )}
    </>
  );
}

export function SettlementHolds({
  data,
  admin = false,
  pendingOnly = false,
}: {
  data: Statement;
  admin?: boolean;
  pendingOnly?: boolean;
}) {
  const options = settlementOptions.filter(
    (option) =>
      !pendingOnly ||
      (!["cleared", "refunded"].includes(option.key) &&
        data.holds[option.key].sellerPaise > 0),
  );
  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold">Settlement holds</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((option) => (
          <div key={option.key} className="rounded-xl bg-slate-50 p-4">
            <p className="font-semibold">{option.label}</p>
            <p className="mt-2 text-sm">
              {data.holds[option.key].orders} orders ·{" "}
              {cash(data.holds[option.key].sellerPaise)}
            </p>
            {admin && (
              <p className="mt-2 text-sm">
                Commission {cash(data.holds[option.key].commissionPaise)} ·
                Collected {cash(data.holds[option.key].collectedPaise)}
              </p>
            )}
          </div>
        ))}
      </div>
      {!admin && (
        <p className="mt-4 text-xs leading-6 text-slate-500">
          Commission is already deducted. Received payouts are excluded from the
          ready balance.
        </p>
      )}
    </Card>
  );
}
