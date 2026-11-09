import { apiRequest } from "../../../lib/api/client";
import { OtpDelivery } from "../../../lib/api/auth-api";
import {
  Attachment,
  buildRegistrationPayload,
  DocumentField,
  DocumentPreviews,
  RegistrationForm,
  StoreInvitation,
} from "./registration-model";

import type { StoreDetails, StoreSummary } from "../../../lib/contracts/store";
export type { StoreDetails, StoreSummary } from "../../../lib/contracts/store";
export const storeQueryKey = (userId?: string) =>
  ["store-registration", userId] as const;

async function encodePhoto(photo: Attachment | null) {
  if (
    !photo ||
    !/^data:image\/jpeg;base64,/.test(photo.uri) ||
    photo.uri.split(",")[1].length > 1398104
  )
    throw new Error("Select a valid prepared document photo.");
  return photo.uri;
}

export const storeApi = {
  invitation: () =>
    apiRequest<{ invitation: StoreInvitation | null }>(
      "/auth/password/invitation",
      { method: "GET" },
    ),
  details: () =>
    apiRequest<{ store: StoreDetails }>("/stores/me/details", {
      method: "GET",
    }),
  documentPreviews: async () => {
    const result = await apiRequest<{
      documents: Partial<
        Record<"storeFrontPhoto" | Exclude<DocumentField, "storePhoto">, string>
      >;
    }>("/stores/me/details/documents", { method: "GET" });
    return {
      documents: {
        storePhoto: result.documents.storeFrontPhoto,
        aadhaarCard: result.documents.aadhaarCard,
        panCard: result.documents.panCard,
        shopLicense: result.documents.shopLicense,
      } satisfies DocumentPreviews,
    };
  },
  requestOwnerOtp: (phone: string) =>
    apiRequest<OtpDelivery>("/stores/owner-phone/request", { body: { phone } }),
  verifyOwnerOtp: (phone: string, code: string) =>
    apiRequest<{ phone: string; ownerPhoneProof: string }>(
      "/stores/owner-phone/verify",
      { body: { phone, code } },
    ),
  get: () =>
    apiRequest<{ store: StoreSummary | null }>("/stores/me", { method: "GET" }),
  setAvailability: (isOpen: boolean) =>
    apiRequest<{ store: StoreSummary }>("/stores/me/availability", {
      method: "PATCH",
      body: { isOpen },
    }),
  register: async (
    form: RegistrationForm,
    ownerPhoneProof?: string,
    expectedRevision?: number,
  ) => {
    const details = buildRegistrationPayload(form);
    // Convert local URIs to bounded image content; never send a device file path.
    const encode = (photo: Attachment | null) =>
      expectedRevision !== undefined && photo?.saved
        ? null
        : encodePhoto(photo);
    const storeFrontPhoto = await encode(form.storePhoto);
    const aadhaarCard = await encode(form.aadhaarCard);
    const panCard = await encode(form.panCard);
    const shopLicense = await encode(form.shopLicense);
    return apiRequest<{
      store: StoreSummary;
      belongsToCurrentAccount: boolean;
    }>(expectedRevision === undefined ? "/stores" : "/stores/me/details", {
      method: expectedRevision === undefined ? "POST" : "PATCH",
      body: {
        ...details,
        ...(ownerPhoneProof ? { ownerPhoneProof } : {}),
        ...(expectedRevision === undefined ? {} : { expectedRevision }),
        storeFrontPhoto,
        aadhaarCard,
        panCard,
        shopLicense,
        termsVersion: "2026-09-11",
      },
      timeoutMs: 60000,
    });
  },
};
