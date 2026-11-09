"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/auth-provider";
import { storeApi, storeQueryKey } from "./store-api";
import { RegistrationFormScreen } from "./registration-form";
import {
  Badge,
  Button,
  Card,
  Details,
  Heading,
  Notice,
  QueryState,
} from "../../../components/ui";

export function StoreScreen({ editing = false }: { editing?: boolean }) {
  const { user } = useAuth();
  const [registrationDismissed, setRegistrationDismissed] = useState(false);
  const pathname = usePathname();
  const target = pathname.startsWith("/seller/application")
    ? "/seller/application"
    : "/seller/store";
  const query = useQuery({
    queryKey: storeQueryKey(user?.id),
    queryFn: storeApi.get,
  });
  const invitation = useQuery({
    queryKey: ["seller-invitation", user?.id],
    queryFn: storeApi.invitation,
    enabled:
      query.isSuccess && !query.data.store && user?.authMethod === "password",
    gcTime: 0,
    retry: false,
  });
  const details = useQuery({
    queryKey: ["store-edit", user?.id],
    queryFn: storeApi.details,
    enabled: editing && !!query.data?.store,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const previews = useQuery({
    queryKey: ["store-edit-document-previews", user?.id],
    queryFn: storeApi.documentPreviews,
    enabled: editing && details.isSuccess,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (query.isPending || query.isError)
    return (
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const store = query.data.store;
  if (
    !store &&
    user?.authMethod === "password" &&
    (invitation.isPending || invitation.isError)
  )
    return (
      <QueryState
        pending={invitation.isPending}
        error={invitation.error}
        retry={() => void invitation.refetch()}
      />
    );
  if (!store)
    return registrationDismissed ? (
      <Card>
        <Heading title="Your store" />
        <p className="mb-5 text-sm leading-7">
          Unsaved registration details were cleared. Shopping and personal
          orders continue in the ZippCart mobile app.
        </p>
        <Button onClick={() => setRegistrationDismissed(false)}>
          Register your store
        </Button>
      </Card>
    ) : (
      <RegistrationFormScreen
        onLeave={() => setRegistrationDismissed(true)}
        invitation={invitation.data?.invitation ?? undefined}
      />
    );
  if (editing) {
    if (user?.reviewer && !user.reviewerFullAccess) {
      return <Notice>Store details are read-only in reviewer mode.</Notice>;
    }
    if (!details.data || !previews.data)
      return (
        <QueryState
          pending={details.isPending || previews.isPending}
          error={details.error || previews.error}
          retry={() => {
            void details.refetch();
            void previews.refetch();
          }}
        />
      );
    return (
      <RegistrationFormScreen
        existing={details.data.store}
        previews={previews.data.documents}
      />
    );
  }
  return (
    <>
      <Heading
        title="Your store"
        description="Registration status, details and corrections."
      />
      <Card>
        <div className="mb-5 flex flex-wrap justify-between gap-3">
          <h2 className="text-xl font-bold">{store.storeName}</h2>
          <Badge>
            {store.status === "approved" && !store.isActive && store.reviewNote
              ? "Store disabled"
              : store.status === "rejected"
                ? "Registration rejected"
                : store.status === "approved"
                  ? "Store approved"
                  : "Pending review"}
          </Badge>
        </div>
        <Details
          values={{
            Category: store.storeCategory,
            Locality: store.locality,
            Pincode: store.pincode,
            Reference: store.id,
            Submitted: new Date(store.createdAt).toLocaleString("en-IN"),
          }}
        />
        {store.reviewNote && <Notice>{store.reviewNote}</Notice>}
        {store.changesPending ? (
          <Notice>
            Changes pending review. Your approved details remain active.
          </Notice>
        ) : user?.reviewer && !user.reviewerFullAccess ? (
          <Notice>Store details are read-only in reviewer mode.</Notice>
        ) : (
          (store.status === "rejected" ||
            (store.status === "approved" && store.isActive)) && (
            <Link
              prefetch={false}
              href={`${target}/edit`}
              className="mt-5 inline-block rounded-xl bg-purple-700 px-4 py-3 font-semibold text-white"
            >
              {store.status === "rejected"
                ? "Correct and resubmit"
                : "Edit store details"}
            </Link>
          )
        )}
        {store.status === "approved" && store.isActive && (
          <Link
            prefetch={false}
            href="/seller"
            className="ml-4 mt-5 inline-block text-purple-800"
          >
            Open Seller dashboard →
          </Link>
        )}
      </Card>
    </>
  );
}
