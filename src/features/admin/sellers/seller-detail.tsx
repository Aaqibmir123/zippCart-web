"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, ShieldCheck, Store, UserRound } from "lucide-react";
import { sellersApi } from "./sellers-api";
import { accountLabels, onboardingLabels, SellerStatus } from "./seller-status";
import { useAuth } from "../../auth/auth-provider";
import {
  Card,
  Details,
  Heading,
  Notice,
  QueryState,
} from "../../../components/ui";
import { ConfirmButton } from "../../../components/confirm-button";

export function SellerDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["admin-seller", user?.id, id],
    queryFn: () => sellersApi.detail(id),
    gcTime: 0,
  });
  if (!query.data)
    return (
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const seller = query.data.seller;
  return (
    <div className="space-y-6">
      <Link
        prefetch={false}
        href="/admin/sellers"
        className="text-sm font-semibold text-purple-800"
      >
        All Sellers
      </Link>
      <Heading
        title={seller.name || "Seller account"}
        description="Account identity, recovery readiness and store onboarding."
      />
      <Card>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <UserRound className="text-purple-700" size={25} />
          <h2 className="text-lg font-bold">Seller information</h2>
          <SellerStatus status={seller.accountStatus}>
            {accountLabels[seller.accountStatus]}
          </SellerStatus>
          <SellerStatus status={seller.onboardingStatus}>
            {onboardingLabels[seller.onboardingStatus]}
          </SellerStatus>
        </div>
        <Details
          values={{
            "Seller name": seller.name,
            "Phone number": seller.phone,
            Email: seller.email || "Not supplied",
            "Store name": seller.storeName,
            Category: seller.category,
            Address: seller.address,
            Created: new Date(seller.createdAt).toLocaleString("en-IN"),
            "Store availability": !seller.storeId
              ? "No Store application"
              : seller.storeActive
                ? "Active"
                : "Inactive / pending approval",
          }}
        />
      </Card>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="text-purple-700" size={21} />
            <h2 className="text-lg font-bold">Password recovery</h2>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            Passwords are never displayed. Reset links go only to the Seller's
            independently verified recovery email; sending a link does not
            change the password.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck
              size={17}
              className={
                seller.recoveryVerified ? "text-emerald-700" : "text-amber-700"
              }
            />
            {seller.recoveryVerified
              ? "Recovery email verified"
              : "Recovery email not verified"}
          </div>
          {!seller.canRecoverPassword && (
            <Notice>
              The Seller must sign in and verify a recovery email in Settings
              before this action is available. An unverified profile email
              cannot reset credentials.
            </Notice>
          )}
          <ConfirmButton
            label="Send password reset link"
            title="Request a password reset?"
            message="Send a single-use reset link to this Seller's verified recovery email. Existing credentials remain valid until the link is consumed."
            disabled={!seller.canRecoverPassword}
            onConfirm={async () =>
              setMessage((await sellersApi.requestReset(id)).message)
            }
          />
          {message && <Notice>{message}</Notice>}
        </Card>
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Store className="text-purple-700" size={21} />
            <h2 className="text-lg font-bold">Store onboarding</h2>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            {seller.storeId
              ? "Review the existing Store application, documents and approval controls. Disabling a Store restricts dashboard access; it does not delete its Seller identity."
              : "This account exists, but the Seller has not submitted a Store application. They must change the temporary password and complete the original onboarding requirements."}
          </p>
          {seller.storeId && (
            <Link
              prefetch={false}
              href={"/admin/stores/" + seller.storeId}
              className="inline-flex min-h-11 items-center rounded-xl bg-purple-700 px-4 text-sm font-semibold text-white"
            >
              Review Store application
            </Link>
          )}
        </Card>
      </div>
    </div>
  );
}
