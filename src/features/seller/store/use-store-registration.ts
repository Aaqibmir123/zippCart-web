import { useState } from "react";
import { useUrlState } from "../../../lib/hooks/use-url-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { storeApi, storeQueryKey, StoreDetails } from "./store-api";
import { useAuth } from "../../auth/auth-provider";
import { authApi } from "../../../lib/api/auth-api";
import {
  createForm,
  FormErrors,
  DocumentPreviews,
  RegistrationForm,
  validateStep,
  storeCategories,
  type StoreInvitation,
} from "./registration-model";

export function formFromStore(
  store: StoreDetails,
  previews: DocumentPreviews = {},
): RegistrationForm {
  const categoryIsPreset = [
    "Fashion",
    "Shoes",
    "Electronics",
    "Beauty",
    "Home & Living",
    "Accessories",
  ].includes(store.storeCategory);
  const saved = (name: string, field: keyof DocumentPreviews) =>
    store.documents.includes(name)
      ? {
          uri: previews[field] ?? "",
          name: "Saved document",
          mimeType: "image/jpeg",
          saved: true,
        }
      : null;
  return {
    ...createForm(store.ownerFullName, store.mobileNumber),
    storeName: store.storeName,
    category: categoryIsPreset ? store.storeCategory : "Other",
    customCategory: categoryIsPreset ? "" : store.storeCategory,
    address: store.fullAddress,
    locality: store.locality,
    pincode: store.pincode,
    storePhoto: saved("storeFrontPhoto", "storePhoto"),
    aadhaarCard: saved("aadhaarCard", "aadhaarCard"),
    panCard: saved("panCard", "panCard"),
    shopLicense: saved("shopLicense", "shopLicense"),
    payoutMethod: store.payout.method,
    ...(store.payout.method === "upi"
      ? { upi: store.payout.upiId }
      : {
          accountHolder: store.payout.accountHolder,
          accountNumber: store.payout.accountNumber,
          ifsc: store.payout.ifsc,
        }),
  };
}

export function useStoreRegistration(
  existing?: StoreDetails,
  documentPreviews?: DocumentPreviews,
  onSaved?: () => void,
  invitation?: StoreInvitation,
) {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState(() =>
    existing
      ? formFromStore(existing, documentPreviews)
      : {
          ...createForm(
            invitation?.ownerName ?? user?.fullName,
            user?.phone?.slice(-10),
          ),
          ...(invitation
            ? {
                storeName: invitation.storeName,
                address: invitation.address,
                category: storeCategories.some(
                  (value) => value === invitation.storeCategory,
                )
                  ? invitation.storeCategory
                  : "Other",
                customCategory: storeCategories.some(
                  (value) => value === invitation.storeCategory,
                )
                  ? ""
                  : invitation.storeCategory,
              }
            : {}),
        },
  );
  const url = useUrlState();
  const step = Math.max(0, Math.min(3, Number(url.get("step", "0")) || 0));
  const setStep = (value: number) => url.set({ step: value });
  const [errors, setErrors] = useState<FormErrors>({});
  const [phoneProof, setPhoneProof] = useState<{
    phone: string;
    ownerPhoneProof: string;
  } | null>(null);
  const [registeredPhone, setRegisteredPhone] = useState("");
  const phoneVerified =
    !!existing ||
    form.mobile === user?.phone ||
    phoneProof?.phone === form.mobile;
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      storeApi.register(
        form,
        !existing && phoneProof?.phone === form.mobile
          ? phoneProof.ownerPhoneProof
          : undefined,
        existing ? (existing.applicationRevision ?? 0) : undefined,
      ),
    retry: false,
    gcTime: 0,
    onError: (error) => {
      if (/verify the seller mobile number/i.test(error.message)) {
        setPhoneProof(null);
        setStep(0);
        setErrors({ mobile: error.message });
      }
    },
    onSuccess: async (result) => {
      if (result.belongsToCurrentAccount)
        client.setQueryData(storeQueryKey(user?.id), { store: result.store });
      else setRegisteredPhone(form.mobile);
      // Permissions always come from the server, never from a submitted form.
      await authApi
        .me()
        .then(({ user: account }) => {
          if (account.id === user?.id) setUser(account);
        })
        .catch(() => undefined);
      void client.invalidateQueries({ queryKey: ["account-access"] });
      setForm(createForm());
      setPhoneProof(null);
      if (existing) {
        client.removeQueries({ queryKey: ["store-edit", user?.id] });
        void client.invalidateQueries({ queryKey: ["admin-stores"] });
        void client.invalidateQueries({ queryKey: ["admin-store-counts"] });
        onSaved?.();
      }
    },
  });

  function update<K extends keyof RegistrationForm>(
    key: K,
    value: RegistrationForm[K],
  ) {
    if (existing && key === "mobile") return;
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "mobile") setPhoneProof(null);
    setErrors((current) => {
      const remaining = { ...current };
      delete remaining[key];
      if (key === "payoutMethod") {
        delete remaining.upi;
        delete remaining.accountHolder;
        delete remaining.accountNumber;
        delete remaining.ifsc;
      }
      return remaining;
    });
  }

  async function next() {
    if (mutation.isPending) return false;
    // Revalidate every step before completing, including conditional payout fields.
    const toCheck = step === 3 ? [0, 1, 2, 3] : [step];
    for (const candidate of toCheck) {
      const found = validateStep(form, candidate);
      if (Object.keys(found).length) {
        setStep(candidate);
        setErrors(found);
        return false;
      }
    }
    if ((step === 0 || step === 3) && !phoneVerified) {
      setStep(0);
      setErrors({
        mobile: "Verify this seller number with OTP before continuing.",
      });
      return false;
    }
    setErrors({});
    if (step < 3) setStep(step + 1);
    else {
      try {
        await mutation.mutateAsync();
      } catch {
        return false;
      }
    }
    return true;
  }

  function back() {
    setErrors({});
    if (mutation.isPending) return;
    mutation.reset();
    setStep(Math.max(0, step - 1));
  }

  return {
    form,
    loginPhone: user?.phone,
    phoneVerified,
    verifyPhone: setPhoneProof,
    registeredPhone,
    step,
    errors,
    busy: mutation.isPending,
    submissionError:
      mutation.error instanceof Error
        ? mutation.error.message
        : mutation.error
          ? "Could not submit. Please try again."
          : "",
    update,
    next,
    back,
  };
}
