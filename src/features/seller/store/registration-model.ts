export const storeCategories = [
  "Fashion",
  "Shoes",
  "Electronics",
  "Beauty",
  "Home & Living",
  "Accessories",
  "Other",
] as const;

export type Attachment = {
  uri: string;
  name: string;
  mimeType: string;
  saved?: boolean;
};
export type DocumentField =
  | "storePhoto"
  | "aadhaarCard"
  | "panCard"
  | "shopLicense";
export type DocumentPreviews = Partial<Record<DocumentField, string>>;
export type RegistrationForm = {
  storeName: string;
  ownerName: string;
  mobile: string;
  category: string;
  customCategory: string;
  address: string;
  locality: string;
  pincode: string;
  storePhoto: Attachment | null;
  aadhaarCard: Attachment | null;
  panCard: Attachment | null;
  shopLicense: Attachment | null;
  payoutMethod: "upi" | "bank";
  upi: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  acceptedTerms: boolean;
};
export type FormErrors = Partial<Record<keyof RegistrationForm, string>>;
export type StoreInvitation = {
  storeName: string;
  storeCategory: string;
  ownerName: string;
  address: string;
};

export const steps = [
  {
    label: "Store",
    title: "Your store starts here.",
    subtitle: "Tell us a little about your business.",
  },
  {
    label: "Address",
    title: "Put your store on the map.",
    subtitle: "Where can customers find your store?",
  },
  {
    label: "Documents",
    title: "Make it official.",
    subtitle: "Add clear photos with every detail visible.",
  },
  {
    label: "Payout",
    title: "The finishing touches.",
    subtitle: "Choose where you would like to receive payouts.",
  },
];

export function createForm(ownerName = "", mobile = ""): RegistrationForm {
  return {
    storeName: "",
    ownerName,
    mobile,
    category: "",
    customCategory: "",
    address: "",
    locality: "",
    pincode: "",
    storePhoto: null,
    aadhaarCard: null,
    panCard: null,
    shopLicense: null,
    payoutMethod: "upi",
    upi: "",
    accountHolder: "",
    accountNumber: "",
    ifsc: "",
    acceptedTerms: false,
  };
}

export function validateStep(form: RegistrationForm, step: number): FormErrors {
  const errors: FormErrors = {};
  const requiredText = (
    key: "storeName" | "ownerName" | "address" | "locality" | "accountHolder",
    min: number,
    message: string,
  ) => {
    if (form[key].trim().length < min) errors[key] = message;
  };
  if (step === 0) {
    requiredText(
      "storeName",
      2,
      "Enter your store name (at least 2 characters).",
    );
    requiredText("ownerName", 2, "Enter the owner’s full name.");
    if (!/^[6-9]\d{9}$/.test(form.mobile))
      errors.mobile = "Enter a valid 10-digit Indian mobile number.";
    if (!storeCategories.some((category) => category === form.category))
      errors.category = "Choose your store category.";
    if (form.category === "Other" && !form.customCategory.trim())
      errors.customCategory = "Enter your store category.";
  }
  if (step === 1) {
    requiredText(
      "address",
      10,
      "Enter the full address, including city and state.",
    );
    requiredText("locality", 2, "Enter the area or locality.");
    if (!/^[1-9]\d{5}$/.test(form.pincode))
      errors.pincode = "Enter a valid 6-digit pincode.";
  }
  if (step === 2) {
    if (!form.storePhoto)
      errors.storePhoto = "Add a photo of your store front.";
    if (!form.aadhaarCard)
      errors.aadhaarCard = "Add a photo of your Aadhaar card.";
    if (!form.panCard) errors.panCard = "Add a photo of your PAN card.";
    if (!form.shopLicense)
      errors.shopLicense = "Add a photo of your shop license.";
  }
  if (step === 3) {
    if (form.payoutMethod === "upi") {
      if (
        !/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(
          form.upi.trim(),
        )
      ) {
        errors.upi = "Enter a valid UPI ID, e.g. yourstore@bank.";
      }
    } else {
      requiredText("accountHolder", 2, "Enter the account holder’s name.");
      if (!/^\d{9,18}$/.test(form.accountNumber))
        errors.accountNumber = "Enter a bank account number with 9–18 digits.";
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.trim()))
        errors.ifsc = "Enter a valid 11-character IFSC code.";
    }
    if (!form.acceptedTerms)
      errors.acceptedTerms = "Accept the Seller Terms to continue.";
  }
  return errors;
}

// Shared form mapping. Activation and ownership are assigned only by the server.
export function buildRegistrationPayload(form: RegistrationForm) {
  return {
    storeName: form.storeName.trim(),
    ownerFullName: form.ownerName.trim(),
    mobileNumber: form.mobile,
    storeCategory:
      form.category === "Other" ? form.customCategory.trim() : form.category,
    fullAddress: form.address.trim(),
    locality: form.locality.trim(),
    pincode: form.pincode,
    storeFrontPhoto: form.storePhoto,
    aadhaarCard: form.aadhaarCard,
    panCard: form.panCard,
    shopLicense: form.shopLicense,
    payout:
      form.payoutMethod === "upi"
        ? { method: "upi" as const, upiId: form.upi.trim() }
        : {
            method: "bank" as const,
            accountHolder: form.accountHolder.trim(),
            accountNumber: form.accountNumber,
            ifsc: form.ifsc.trim(),
          },
    sellerTermsAccepted: form.acceptedTerms,
  };
}
