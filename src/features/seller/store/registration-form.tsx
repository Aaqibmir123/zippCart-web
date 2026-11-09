"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStoreRegistration } from "./use-store-registration";
import {
  storeCategories,
  steps,
  type DocumentPreviews,
  type RegistrationForm,
  type StoreInvitation,
} from "./registration-model";
import type { StoreDetails } from "../../../lib/contracts/store";
import { OwnerPhoneVerification } from "./owner-phone-verification";
import { DocumentUpload } from "./document-upload";
import {
  Button,
  Card,
  Check,
  Field,
  Heading,
  Notice,
  Select,
} from "../../../components/ui";
import { ConfirmButton } from "../../../components/confirm-button";

export function RegistrationFormScreen({
  existing,
  previews,
  onLeave,
  invitation,
}: {
  existing?: StoreDetails;
  previews?: DocumentPreviews;
  onLeave?: () => void;
  invitation?: StoreInvitation;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const target = pathname.startsWith("/seller/application")
    ? "/seller/application"
    : "/seller/store";
  const state = useStoreRegistration(
    existing,
    previews,
    () => router.push(target),
    invitation,
  );
  const [termsOpen, setTermsOpen] = useState(false);
  const leave = () => (onLeave ? onLeave() : router.push(target));
  const { form, update, errors, busy, step } = state;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  function field(
    name: keyof RegistrationForm,
    label: string,
    maxLength = 100,
    numeric = false,
  ) {
    return (
      <Field
        label={label}
        value={String(form[name] ?? "")}
        onChange={(event) =>
          update(
            name,
            numeric
              ? event.target.value.replace(/\D/g, "")
              : event.target.value,
          )
        }
        maxLength={maxLength}
        inputMode={numeric ? "numeric" : undefined}
        disabled={busy || ((!!existing || !!invitation) && name === "mobile")}
        error={errors[name]}
      />
    );
  }
  if (state.registeredPhone)
    return (
      <Card>
        <Heading
          title="Registration saved"
          description={`The store is linked to +91 ${state.registeredPhone}. Sign in with that number to view its status. Seller Mode becomes available after Admin approval.`}
        />
        <Button onClick={leave}>Back to store</Button>
      </Card>
    );
  return (
    <>
      <Heading
        title={existing ? "Edit store details" : "Register your store"}
        description={`Step ${step + 1} of 4 · ${steps[step].title}`}
      />
      <p className="mb-5 text-sm text-slate-600">{steps[step].subtitle}</p>
      <div className="mb-5 flex flex-wrap gap-3">
        {steps.map((item, index) => (
          <span
            key={item.label}
            className={`rounded-full px-4 py-2 text-sm ${index === step ? "bg-purple-700 text-white" : "bg-purple-50 text-purple-800"}`}
          >
            {index + 1}. {item.label}
          </span>
        ))}
      </div>
      <div className="space-y-5">
        {step === 0 && (
          <>
            <Card>
              <div className="grid gap-5 sm:grid-cols-2">
                {field("storeName", "Store name")}
                {field("ownerName", "Owner full name")}
                {field("mobile", "Seller login number", 10, true)}
                <Select
                  label="Store category"
                  value={form.category}
                  onChange={(value) => update("category", value)}
                  disabled={busy}
                  options={[
                    { value: "", label: "Choose category" },
                    ...storeCategories,
                  ]}
                />
                {form.category === "Other" &&
                  field("customCategory", "Your store category", 80)}
              </div>
              {errors.category && <Notice error>{errors.category}</Notice>}
              {existing && (
                <p className="mt-4 text-xs">
                  Your seller number stays linked to the store. Contact support
                  if it needs to change.
                </p>
              )}
            </Card>
            <OwnerPhoneVerification
              key={form.mobile}
              phone={form.mobile}
              loginPhone={state.loginPhone}
              verified={state.phoneVerified}
              onVerified={state.verifyPhone}
            />
          </>
        )}
        {step === 1 && (
          <Card>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                {field("address", "Full address", 350)}
              </div>
              {field("locality", "Area / Locality")}
              {field("pincode", "Pincode", 6, true)}
            </div>
          </Card>
        )}
        {step === 2 && (
          <Card>
            <div className="grid gap-5 sm:grid-cols-2">
              {(
                [
                  ["storePhoto", "Store front photo"],
                  ["aadhaarCard", "Aadhaar card"],
                  ["panCard", "PAN card"],
                  ["shopLicense", "Shop license"],
                ] as const
              ).map(([name, label]) => (
                <DocumentUpload
                  key={name}
                  label={label}
                  value={form[name]}
                  onChange={(value) => update(name, value)}
                  disabled={busy}
                  error={errors[name]}
                />
              ))}
            </div>
          </Card>
        )}
        {step === 3 && (
          <Card>
            <div className="space-y-5">
              <Select
                label="Payout method"
                value={form.payoutMethod}
                onChange={(value) =>
                  update("payoutMethod", value as "upi" | "bank")
                }
                options={["upi", "bank"]}
                disabled={busy}
              />
              {form.payoutMethod === "upi" ? (
                field("upi", "UPI ID", 256)
              ) : (
                <>
                  {field("accountHolder", "Account holder")}
                  {field("accountNumber", "Account number", 18, true)}
                  <Field
                    label="IFSC"
                    value={form.ifsc}
                    onChange={(event) =>
                      update("ifsc", event.target.value.toUpperCase())
                    }
                    maxLength={11}
                    disabled={busy}
                    error={errors.ifsc}
                  />
                </>
              )}
              <Button
                variant="secondary"
                onClick={() => setTermsOpen(!termsOpen)}
              >
                {termsOpen ? "Hide Seller Terms" : "Read Seller Terms"}
              </Button>
              {termsOpen && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm leading-7">
                  <h2 className="font-bold">Store registration terms</h2>
                  <p>
                    Provide accurate store, owner, address and payout details.
                    Only share documents you are authorised to provide.
                  </p>
                  <p>
                    By submitting, you agree to send your store photo, Aadhaar
                    card, PAN card, shop license and payout details to ZippCart
                    for seller registration. Your acceptance is recorded with
                    this application.
                  </p>
                  <p>
                    You confirm that you are authorised to register this store
                    and that the supplied identity and shop license documents
                    belong to the owner or business.
                  </p>
                  <p>
                    A submitted registration requires review before a store
                    becomes active. Submitting does not activate your store.
                  </p>
                </div>
              )}
              <Check
                label="I have read and accept the Seller Terms."
                checked={form.acceptedTerms}
                onChange={(value) => update("acceptedTerms", value)}
                disabled={busy}
              />
              {errors.acceptedTerms && (
                <Notice error>{errors.acceptedTerms}</Notice>
              )}
            </div>
          </Card>
        )}
        {state.submissionError && (
          <Notice error>{state.submissionError}</Notice>
        )}
        <div className="flex flex-wrap justify-between gap-3">
          {step ? (
            <Button variant="secondary" disabled={busy} onClick={state.back}>
              Previous step
            </Button>
          ) : (
            <ConfirmButton
              label="Leave"
              title="Leave store registration?"
              message="Unsaved details will be cleared when you leave."
              danger
              disabled={busy}
              onConfirm={async () => leave()}
            />
          )}
          <Button
            disabled={busy}
            onClick={async () => {
              await state.next();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            {busy
              ? "Saving…"
              : step === 3
                ? existing
                  ? "Submit changes for review"
                  : "Submit registration"
                : "Continue"}
          </Button>
        </div>
      </div>
    </>
  );
}
