"use client";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { useScreenActive } from "../../../lib/hooks/use-page-active";
import { useUrlState } from "../../../lib/hooks/use-url-state";
import { supportApi } from "./support-api";
import { CaseActions } from "./case-actions";
import { CaseDetails } from "./case-details";
import { Conversation } from "./conversation";
import { EvidencePhotos } from "./evidence-photos";
import { eventLabels } from "./support-model";
import { statusLabels } from "../../../lib/contracts/returns";
import { Button, Card, Heading, QueryState } from "../../../components/ui";
export function CaseScreen({
  orderId,
  caseId,
}: {
  orderId: string;
  caseId: string;
}) {
  const { user } = useAuth();
  const active = useScreenActive();
  const url = useUrlState();
  const client = useQueryClient();
  const tab = url.get("tab", "messages");
  const query = useQuery({
    queryKey: ["return-cases", user?.id, orderId, true],
    queryFn: () => supportApi.cases(orderId),
    enabled: active,
    refetchInterval: active ? 15000 : false,
  });
  const record = query.data?.cases.find((item) => item.id === caseId);
  async function refresh() {
    await Promise.all(
      [
        "return-cases",
        "return-admin",
        "admin-analytics",
        "admin-shipping-all",
        "seller-orders",
        "seller-products",
        "seller-product",
        "inventory-alerts",
        "earnings",
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  }
  return (
    <>
      <Link
        prefetch={false}
        href="/admin/support"
        className="mb-5 inline-block font-semibold text-purple-800"
      >
        ← Support requests
      </Link>
      <Heading
        title="Customer conversation"
        description={
          record
            ? `${record.requestId} · ${statusLabels[record.status]}`
            : undefined
        }
      />
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
        empty={!record && query.isSuccess}
      />
      {record && (
        <>
          <nav aria-label="Request views" className="mb-5 flex flex-wrap gap-3">
            {[
              ["messages", record.unread ? "Chat · New" : "Chat"],
              ["details", "Manage"],
              ["history", "History"],
            ].map(([value, label]) => (
              <Button
                key={value}
                variant={tab === value ? "primary" : "secondary"}
                onClick={() => url.set({ tab: value })}
              >
                {label}
              </Button>
            ))}
          </nav>
          <div hidden={tab !== "messages"}>
            <Conversation
              record={record}
              active={tab === "messages"}
              refresh={refresh}
            />
          </div>
          {tab === "details" && (
            <div className="space-y-5">
              {!query.isError && (
                <CaseActions
                  key={record.id}
                  record={record}
                  refresh={refresh}
                />
              )}
              <CaseDetails record={record} />
            </div>
          )}
          {tab === "history" && (
            <div className="space-y-4">
              {record.history.map((event) => (
                <Card key={event.id}>
                  <h2 className="font-semibold">
                    {eventLabels[event.action] ?? event.action} ·{" "}
                    {statusLabels[event.status]}
                  </h2>
                  <p className="my-3 whitespace-pre-wrap text-sm">
                    {event.note}
                  </p>
                  <p className="mb-3 text-xs">
                    {event.actor} · {new Date(event.at).toLocaleString("en-IN")}
                  </p>
                  {event.address && (
                    <p className="mb-3 text-sm">
                      {Object.values(event.address).join(", ")}
                    </p>
                  )}
                  {event.schedule && (
                    <p className="mb-3 text-sm">
                      {event.schedule.mode} · {event.schedule.start} –{" "}
                      {event.schedule.end} · {event.schedule.contact} ·{" "}
                      {event.schedule.reference} · {event.schedule.instructions}
                    </p>
                  )}
                  <EvidencePhotos orderId={orderId} ids={event.photoIds} />
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
