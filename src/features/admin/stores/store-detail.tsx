"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminStoreApi, type DocumentName } from "./stores-api";
import { useAuth } from "../../auth/auth-provider";
import {
  Badge,
  Button,
  Card,
  Details,
  Heading,
  Notice,
  QueryState,
  TextArea,
} from "../../../components/ui";
import { Dialog } from "../../../components/dialog";
import { ConfirmButton } from "../../../components/confirm-button";

const documents: { name: DocumentName; label: string }[] = [
  { name: "storeFrontPhoto", label: "Store front" },
  { name: "aadhaarCard", label: "Aadhaar card" },
  { name: "panCard", label: "PAN card" },
  { name: "shopLicense", label: "Shop license" },
];
function DocumentPreview({
  id,
  name,
  title,
  close,
}: {
  id: string;
  name: DocumentName;
  title: string;
  close: () => void;
}) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["admin-document", user?.id, id, name],
    queryFn: () => adminStoreApi.document(id, name),
    gcTime: 0,
    retry: false,
  });
  return (
    <Dialog title={title} onClose={close}>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && (
        <img
          src={query.data.dataUrl}
          alt={title}
          className="max-h-[70dvh] w-full object-contain"
        />
      )}
    </Dialog>
  );
}
export function StoreDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [note, setNote] = useState("");
  const [document, setDocument] = useState<(typeof documents)[number] | null>(
    null,
  );
  const [feedback, setFeedback] = useState("");
  const query = useQuery({
    queryKey: ["admin-store-detail", user?.id, id],
    queryFn: () => adminStoreApi.detail(id),
    gcTime: 0,
    retry: false,
  });
  const store = query.data?.store;
  async function refresh(message: string) {
    setFeedback(message);
    setNote("");
    await Promise.all(
      [
        "admin-stores",
        "admin-store-counts",
        "admin-store-detail",
        "account-access",
        "store-registration",
        "admin-analytics",
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  }
  return (
    <>
      <Link
        prefetch={false}
        className="mb-5 inline-block text-sm font-semibold text-purple-800"
        href="/admin/stores"
      >
        ← Stores
      </Link>
      <Heading
        title="Store details"
        description="Application details, private documents and review history."
      />
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {feedback && <Notice>{feedback}</Notice>}
      {store && (
        <div className="space-y-5">
          <Card>
            <div className="mb-5 flex flex-wrap justify-between gap-3">
              <h2 className="text-xl font-bold">{store.storeName}</h2>
              <Badge>{store.status}</Badge>
            </div>
            {store.changesPending && (
              <Notice>
                Proposed changes are awaiting review. Existing approved details
                stay active until approval.
              </Notice>
            )}
            <Details
              values={{
                Owner: store.ownerFullName,
                Phone: store.mobileNumber,
                Category: store.storeCategory,
                Address: store.fullAddress,
                Locality: store.locality,
                Pincode: store.pincode,
                Status: store.isActive ? "Active" : "Inactive",
                Availability: store.isOpen ? "Open" : "Closed",
                Created: new Date(store.createdAt).toLocaleString("en-IN"),
                Reviewed:
                  store.reviewedAt &&
                  new Date(store.reviewedAt).toLocaleString("en-IN"),
                "Terms version": store.termsVersion,
                "Terms accepted": store.termsAcceptedAt,
                Revision: store.applicationRevision ?? 0,
              }}
            />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-bold">Payout account</h2>
            <Details
              values={
                store.payout.method === "upi"
                  ? { Method: "UPI", "UPI ID": store.payout.upiId }
                  : {
                      Method: "Bank",
                      Holder: store.payout.accountHolder,
                      Account: store.payout.accountNumber,
                      IFSC: store.payout.ifsc,
                    }
              }
            />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-bold">Private documents</h2>
            <div className="flex flex-wrap gap-3">
              {documents.map((item) => (
                <Button
                  key={item.name}
                  variant="secondary"
                  onClick={() => setDocument(item)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-bold">Review</h2>
            {store.reviewNote && <Notice>{store.reviewNote}</Notice>}
            <TextArea
              label="Review feedback"
              value={note}
              onChange={setNote}
              maxLength={500}
            />
            <div className="mt-5 flex flex-wrap gap-3">
              {(store.status === "pending" || store.changesPending) && (
                <>
                  <ConfirmButton
                    label="Approve store"
                    title="Approve this store?"
                    message={
                      store.changesPending
                        ? "Apply the proposed details to the active store?"
                        : "The owner will gain Seller Mode access."
                    }
                    disabled={query.isFetching || query.isError}
                    onConfirm={async () => {
                      await adminStoreApi.review(
                        id,
                        "approved",
                        store.status,
                        store.applicationRevision ?? 0,
                        note,
                      );
                      await refresh("Store approved.");
                    }}
                  />
                  <ConfirmButton
                    label="Reject request"
                    title="Reject this request?"
                    danger
                    message="The seller will receive your review feedback. Existing approved details remain active when proposed changes are rejected."
                    disabled={
                      query.isFetching ||
                      query.isError ||
                      note.trim().length < 5
                    }
                    onConfirm={async () => {
                      await adminStoreApi.review(
                        id,
                        "rejected",
                        store.status,
                        store.applicationRevision ?? 0,
                        note,
                      );
                      await refresh("Request rejected.");
                    }}
                  />
                </>
              )}
              {store.status === "approved" && (
                <ConfirmButton
                  label={store.isActive ? "Disable store" : "Enable store"}
                  title={
                    store.isActive
                      ? "Disable this store?"
                      : "Enable this store?"
                  }
                  danger={store.isActive}
                  message={
                    store.isActive
                      ? `Stop selling and accepting new orders. Reason: ${note.trim()}`
                      : "Restore Seller access. The seller can reopen the store."
                  }
                  disabled={
                    query.isFetching ||
                    query.isError ||
                    (store.isActive && note.trim().length < 5)
                  }
                  onConfirm={async () => {
                    await adminStoreApi.setActive(
                      id,
                      !store.isActive,
                      store.applicationRevision ?? 0,
                      store.isActive ? note.trim() : "",
                    );
                    await refresh(
                      store.isActive ? "Store disabled." : "Store enabled.",
                    );
                  }}
                />
              )}
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-bold">Review history</h2>
            {store.reviewHistory?.map((event, index) => (
              <div key={index} className="border-b border-slate-100 py-3">
                <p className="text-sm font-semibold">
                  {event.action.replaceAll("_", " ")} ·{" "}
                  {new Date(event.at).toLocaleString("en-IN")}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{event.note}</p>
              </div>
            ))}
          </Card>
        </div>
      )}
      {document && (
        <DocumentPreview
          id={id}
          name={document.name}
          title={document.label}
          close={() => setDocument(null)}
        />
      )}
    </>
  );
}
