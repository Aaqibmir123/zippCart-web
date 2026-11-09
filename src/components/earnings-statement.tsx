"use client";
import { useState } from "react";
import { BalanceSummary, SettlementHolds } from "./earnings-balances";
import { useAuth } from "../features/auth/auth-provider";
import {
  localDate,
  useEarnings,
  usePayoutAccount,
  type StoreEarning,
  type PayoutAccount,
} from "../lib/earnings/earnings-api";
import { cash } from "../lib/earnings/payout-format";
import {
  settlementOptions,
  settlementNote,
  type SettlementFilter,
} from "../lib/earnings/settlement-model";
import { useUrlState } from "../lib/hooks/use-url-state";
import {
  Badge,
  Button,
  Card,
  Check,
  Details,
  Field,
  Heading,
  Notice,
  Pagination,
  QueryState,
  Select,
} from "./ui";

export function AccountDetails({ account }: { account: PayoutAccount }) {
  return (
    <Details
      values={
        account.method === "upi"
          ? { Method: "UPI", "UPI ID": account.upiId }
          : {
              Method: "Bank",
              "Account holder": account.accountHolder,
              "Account number": account.accountNumber,
              IFSC: account.ifsc,
            }
      }
    />
  );
}
function Account({ admin, storeId }: { admin: boolean; storeId: string }) {
  const query = usePayoutAccount(admin, storeId);
  return (
    <Card>
      <h3 className="mb-4 font-bold">Payout account</h3>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.account ? (
        <AccountDetails account={query.data.account} />
      ) : (
        query.isSuccess && <p className="text-sm">No payout account saved.</p>
      )}
    </Card>
  );
}
export function EarningsStatement({
  admin = false,
  onPay,
  onCollect,
}: {
  admin?: boolean;
  onPay?: (store: StoreEarning) => void;
  onCollect?: (id: string) => void;
}) {
  const url = useUrlState();
  const { user } = useAuth();
  const period = url.get("period", "week");
  const date = url.get("date", localDate());
  const storeId = admin ? url.get("storeId") : "";
  const page = Math.max(1, Number(url.get("page", "1")) || 1);
  const tab = url.get("tab", "Balances");
  const filter = url.get("state", "all") as SettlementFilter;
  const [search, setSearch] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  const [limit, setLimit] = useState(20);
  const query = useEarnings(admin, period, date, storeId, page, filter);
  const data = query.data;
  const reviewer = user?.reviewer && !user.reviewerFullAccess;
  function shift(direction: number) {
    const next = new Date(
      `${date.slice(0, 7)}-${period === "month" ? "01" : date.slice(8)}T00:00:00Z`,
    );
    if (period === "month") next.setUTCMonth(next.getUTCMonth() + direction);
    else next.setUTCDate(next.getUTCDate() + direction * 7);
    url.set({ date: next.toISOString().slice(0, 10), page: 1 });
  }
  if (reviewer)
    return (
      <Notice>
        Financial records and payout actions are unavailable in Google Play
        reviewer mode.
      </Notice>
    );
  const stores =
    data?.stores.filter(
      (store) =>
        store.name.toLowerCase().includes(search.trim().toLowerCase()) &&
        (!dueOnly || store.availablePaise > 0),
    ) ?? [];
  return (
    <>
      <Heading
        title={admin ? "Seller payouts" : "My earnings"}
        description="Balances, settlement holds, statements and completed payout records."
      />
      {storeId && (
        <Button
          variant="secondary"
          onClick={() => url.set({ storeId: null, page: 1 })}
        >
          All sellers
        </Button>
      )}
      <nav aria-label="Earnings views" className="my-5 flex flex-wrap gap-3">
        {["Balances", "Orders", "History"].map((value) => (
          <Button
            key={value}
            variant={tab === value ? "primary" : "secondary"}
            onClick={() => url.set({ tab: value, page: 1 })}
          >
            {value === "Orders" ? "Earnings" : value}
          </Button>
        ))}
      </nav>
      {tab !== "Balances" && (
        <Card className="mb-5">
          <div className="grid items-end gap-4 sm:grid-cols-3">
            <Select
              label="Statement period"
              value={period}
              onChange={(value) => url.set({ period: value, page: 1 })}
              options={["week", "month"]}
            />
            <Field
              label="Statement date"
              type="date"
              value={date}
              onChange={(event) =>
                url.set({ date: event.target.value || localDate(), page: 1 })
              }
            />
            <Select
              label="Settlement state"
              value={filter}
              onChange={(value) => url.set({ state: value, page: 1 })}
              options={[
                { value: "all", label: "All states" },
                ...settlementOptions.map((value) => ({
                  value: value.key,
                  label: value.label,
                })),
              ]}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => shift(-1)}>
              Previous period
            </Button>
            <Button
              variant="secondary"
              onClick={() => url.set({ date: localDate(), page: 1 })}
            >
              Today
            </Button>
            <Button variant="secondary" onClick={() => shift(1)}>
              Next period
            </Button>
          </div>
        </Card>
      )}
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {data && (
        <div className="space-y-5">
          {tab === "Balances" ? (
            <>
              <BalanceSummary data={data} admin={admin} />
              <SettlementHolds data={data} admin={admin} />
              {admin && !storeId && (
                <Card>
                  <Field
                    label="Search seller"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setLimit(20);
                    }}
                  />
                  <div className="mt-4">
                    <Check
                      label="Ready to pay only"
                      checked={dueOnly}
                      onChange={(value) => {
                        setDueOnly(value);
                        setLimit(20);
                      }}
                    />
                  </div>
                </Card>
              )}
              {stores
                .slice(0, admin && !storeId ? limit : undefined)
                .map((store) => (
                  <div key={store.storeId} className="space-y-4">
                    <Card>
                      <h2 className="mb-4 text-lg font-bold">{store.name}</h2>
                      <Details
                        values={{
                          "Total net (including pending)": cash(
                            store.lifetime.netPaise,
                          ),
                          "Already paid": cash(store.paidPaise),
                          "Remaining balance": cash(store.balancePaise),
                          "Ready to pay": cash(store.availablePaise),
                          "On hold": cash(store.heldPaise),
                          Method:
                            store.payoutMethod?.toUpperCase() ?? "No account",
                        }}
                      />
                      <div className="mt-5 flex flex-wrap gap-3">
                        {admin && !storeId && (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              url.set({ storeId: store.storeId, page: 1 })
                            }
                          >
                            Store statement
                          </Button>
                        )}
                        {admin &&
                          storeId &&
                          store.availablePaise > 0 &&
                          onPay && (
                            <Button
                              disabled={query.isError}
                              onClick={() => onPay(store)}
                            >
                              Record completed payout
                            </Button>
                          )}
                      </div>
                    </Card>
                    {(!admin || !!storeId) && (
                      <Account admin={admin} storeId={store.storeId} />
                    )}
                  </div>
                ))}
              {admin && !storeId && stores.length > limit && (
                <Button
                  variant="secondary"
                  onClick={() => setLimit(limit + 20)}
                >
                  Show more sellers
                </Button>
              )}
            </>
          ) : tab === "Orders" ? (
            <>
              <Card>
                <h2 className="mb-4 text-lg font-bold">
                  Selected {data.period}: {data.from} – {data.to}
                </h2>
                <Details
                  values={{
                    "Order item sales": cash(data.totals.grossPaise),
                    Refunds: cash(-data.totals.refundPaise),
                    [admin ? "Calculated commission" : "Commission deducted"]:
                      cash(
                        admin
                          ? data.totals.commissionPaise
                          : -data.totals.commissionPaise,
                      ),
                    [admin ? "Seller earnings" : "Your earnings"]: cash(
                      data.totals.netPaise,
                    ),
                    ...(admin
                      ? {
                          "Cleared commission": cash(
                            data.totals.clearedCommissionPaise,
                          ),
                          "Pending commission": cash(
                            data.totals.pendingCommissionPaise,
                          ),
                          "Verified collection": cash(data.collectedPaise),
                          "Collection pending": cash(data.uncollectedPaise),
                        }
                      : {}),
                  }}
                />
                <p className="mt-4 text-xs text-slate-500">
                  Item amounts only. Delivery charges excluded. Received orders
                  use delivery date; undelivered orders use purchase date.
                </p>
              </Card>
              {!data.orderCount && (
                <Notice>No orders match this period and status.</Notice>
              )}
              {data.orders.map((order) => (
                <Card key={`${order.orderId}:${order.storeId}`}>
                  <h3 className="font-bold">
                    #{order.orderId.slice(-8).toUpperCase()}
                  </h3>
                  <p className="my-3 text-xs">
                    {new Date(
                      (order.receivedAt ?? order.createdAt)!,
                    ).toLocaleString("en-IN")}
                  </p>
                  {admin && (
                    <p className="mb-3 text-sm">
                      {
                        data.stores.find(
                          (store) => store.storeId === order.storeId,
                        )?.name
                      }
                    </p>
                  )}
                  <Details
                    values={{
                      ...Object.fromEntries(
                        order.items.map((item, index) => [
                          `${item.name} × ${item.quantity} (${index + 1})`,
                          cash(item.amountPaise),
                        ]),
                      ),
                      ...(order.refundPaise > 0
                        ? { Refunds: cash(-order.refundPaise) }
                        : {}),
                      [`Commission (${order.commissionBps / 100}%)`]: cash(
                        -order.commissionPaise,
                      ),
                      [admin ? "Seller earnings" : "Your earnings"]: cash(
                        order.netPaise,
                      ),
                    }}
                  />
                  <div className="mt-4">
                    <Badge>{order.state.replaceAll("_", " ")}</Badge>
                    <p className="mt-3 text-sm">{settlementNote(order)}</p>
                  </div>
                  {admin &&
                    order.receivedAt &&
                    !order.paymentVerified &&
                    onCollect && (
                      <Button
                        className="mt-4"
                        disabled={query.isError}
                        onClick={() => onCollect(order.orderId)}
                      >
                        Verify collected payment
                      </Button>
                    )}
                </Card>
              ))}
            </>
          ) : (
            <>
              <Notice>
                Paid in selected period: {cash(data.periodPaidPaise)}
              </Notice>
              {!data.payoutCount && <Notice>No payouts in this period.</Notice>}
              {data.payouts.map((payout) => (
                <Card key={payout.id}>
                  <h3 className="text-xl font-bold">
                    {cash(payout.amountPaise)}
                  </h3>
                  <Details
                    values={{
                      Method: payout.method.toUpperCase(),
                      Date: new Date(payout.createdAt).toLocaleString("en-IN"),
                      Reference: payout.reference,
                      "Settled through": payout.settledThrough,
                      Store: admin
                        ? data.stores.find(
                            (store) => store.storeId === payout.storeId,
                          )?.name
                        : undefined,
                    }}
                  />
                </Card>
              ))}
            </>
          )}
          {tab !== "Balances" && (
            <Pagination
              page={page}
              hasMore={
                page * 30 <
                (tab === "Orders" ? data.orderCount : data.payoutCount)
              }
              busy={query.isFetching}
              onPage={(value) => url.set({ page: value })}
            />
          )}
        </div>
      )}
    </>
  );
}
