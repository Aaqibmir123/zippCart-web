"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { sellersApi } from "./sellers-api";
import { validateInvitation } from "./invitation-model";
import {
  Button,
  Card,
  Field,
  Heading,
  Notice,
  Select,
  TextArea,
} from "../../../components/ui";

const blank = {
  sellerName: "",
  phone: "",
  email: "",
  storeName: "",
  address: "",
  category: "Fashion",
  password: "",
};
export function CreateSellerScreen() {
  const client = useQueryClient();
  const [createdId, setCreatedId] = useState("");
  const [form, setForm] = useState(blank);
  const [customCategory, setCustomCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [delivery, setDelivery] = useState<string | null>(null);
  const lock = useRef(false);
  const clientKey = useRef("");
  function update(key: keyof typeof blank, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setError("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const values = new FormData(event.currentTarget as HTMLFormElement);
    clientKey.current ||= crypto.randomUUID();
    const input = {
      ...form,
      password: String(values.get("password") ?? ""),
      email: form.email.trim().toLowerCase(),
      category:
        form.category === "Other" ? customCategory.trim() : form.category,
      clientKey: clientKey.current,
    };
    const issue = validateInvitation(input);
    if (issue) {
      setError(issue);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await sellersApi.create(input);
      setDelivery(result.emailDelivery);
      setCreatedId(result.sellerId);
      void client.invalidateQueries({ queryKey: ["admin-sellers"] });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create this Seller.",
      );
    } finally {
      setForm((previous) => ({ ...previous, password: "" }));
      lock.current = false;
      setBusy(false);
    }
  }
  const field = (
    key: keyof typeof blank,
    label: string,
    maxLength = 100,
    type = "text",
  ) => (
    <Field
      label={label}
      name={key}
      type={type}
      maxLength={maxLength}
      value={form[key]}
      onChange={(event) =>
        update(
          key,
          key === "phone"
            ? event.target.value.replace(/\D/g, "").slice(0, 10)
            : event.target.value,
        )
      }
      required
      disabled={busy}
      autoComplete={
        type === "password" ? "new-password" : key === "email" ? "email" : "off"
      }
      minLength={type === "password" ? 12 : undefined}
    />
  );
  return (
    <>
      <Heading
        title="Create Seller"
        description="Invite a Seller with secure workspace access. Store activation follows the existing registration and approval process."
      />
      {delivery !== null ? (
        <Card className="max-w-2xl space-y-5">
          <h2 className="text-xl font-bold">Seller invited</h2>
          <Link
            prefetch={false}
            href={"/admin/sellers/" + createdId}
            className="inline-flex min-h-11 items-center rounded-xl bg-purple-700 px-4 text-sm font-semibold text-white"
          >
            View Seller account
          </Link>
          <p className="text-sm leading-7">
            The Seller can sign in with their phone number and the initial
            password you supplied. They must change that password before
            continuing, then complete registration, documents, payout details
            and Seller terms for review.
          </p>
          <Notice>
            {delivery === "accepted"
              ? "Verification email accepted by the provider. The address remains unverified until the Seller confirms the link."
              : delivery === "previous_request"
                ? "The original request was already saved. No duplicate account was created. The Seller can resend email verification from Settings."
                : "The account was created with an unverified email. Verification delivery is unavailable or failed; the Seller can resend from Settings after email setup."}
          </Notice>
          <Button
            onClick={() => {
              setForm(blank);
              setCustomCategory("");
              clientKey.current = "";
              setDelivery(null);
            }}
          >
            Create another Seller
          </Button>
        </Card>
      ) : (
        <Card className="max-w-3xl">
          <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              {field("sellerName", "Seller name")}
              {field("phone", "Phone number", 10, "tel")}
              {field("email", "Email", 254, "email")}
              {field("storeName", "Store name")}
              <Select
                label="Store category"
                value={form.category}
                onChange={(value) => update("category", value)}
                disabled={busy}
                options={[
                  "Fashion",
                  "Shoes",
                  "Electronics",
                  "Beauty",
                  "Home & Living",
                  "Accessories",
                  "Other",
                ]}
              />
              {form.category === "Other" && (
                <Field
                  label="Custom store category"
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  maxLength={80}
                  required
                  disabled={busy}
                />
              )}
            </div>
            <TextArea
              label="Store address"
              value={form.address}
              onChange={(value) => update("address", value)}
              maxLength={350}
              disabled={busy}
            />
            {field("password", "Initial password", 128, "password")}
            <p className="text-sm leading-6 text-slate-500">
              Use at least 12 characters. Share the initial password privately;
              it is never included in verification emails. The Seller must
              replace it at first login.
            </p>
            {error && <Notice error>{error}</Notice>}
            <Button type="submit" disabled={busy}>
              {busy ? "Creating Seller…" : "Create Seller"}
            </Button>
          </form>
        </Card>
      )}
      <Link
        prefetch={false}
        href="/admin/sellers"
        className="mt-6 inline-block font-semibold text-purple-800"
      >
        Back to sellers
      </Link>
    </>
  );
}
