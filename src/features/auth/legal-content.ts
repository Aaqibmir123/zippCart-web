import { APP_NAME } from "../../lib/brand";
import { REVIEW_POLICY } from "../../lib/contracts/review-policy";

export type LegalDocument = {
  title: string;
  eyebrow: string;
  intro: string;
  sections: { title: string; body: string }[];
};

// Content describes the current build. Confirm operator/contact details,
// retention, service providers and commercial policies before publication.
export const termsDocument: LegalDocument = {
  title: "Terms & Conditions",
  eyebrow: `SHOPPING WITH ${APP_NAME.toUpperCase()}`,
  intro: "A few things to know before you start shopping.",
  sections: [
    {
      title: "Using ZippCart",
      body: "Use your own mobile number to sign in and keep your verification codes private. Provide accurate profile and delivery details, and use the app only for lawful purposes.",
    },
    {
      title: "Your account",
      body: "Sign in with a verified mobile number to browse products, save favourites and manage your cart. Existing order history remains available. Your shopping records belong to your account.",
    },
    {
      title: "Products & prices",
      body: "Check the products, quantities, prices and any displayed charges in your cart before proceeding. Prices and availability may change. The total shown for an order applies to the items and quantities confirmed at checkout.",
    },
    {
      title: "Checkout & payment",
      body: "Checkout is currently disabled. New orders, cash-on-delivery checkout and online payments are unavailable. You can browse and manage your cart while ordering is marked Coming soon. The app does not collect card details or UPI PINs.",
    },
    {
      title: "Order details",
      body: "You can review saved orders in Order history. Reordering adds the selected products and quantities to your cart for another review before checkout; it does not automatically place an order.",
    },
    {
      title: "Responsible use",
      body: "Do not attempt to access another person's account, interfere with the service or upload content you do not have permission to use. Only add profile information and photos you are entitled to share.",
    },
    {
      title: "Updates to these terms",
      body: "These terms describe the current app experience. Changes to available features or shopping services may require updates to this page. Review the latest version when using a new feature.",
    },
    { title: "Reviews, seller replies & moderation", body: REVIEW_POLICY },
  ],
};

export const privacyDocument: LegalDocument = {
  title: "Privacy Policy",
  eyebrow: "YOUR INFORMATION",
  intro: "Understand what you share and how the app uses it.",
  sections: [
    {
      title: "Seller registration",
      body: "If you register a store, ZippCart receives your store and owner details, address, mobile number, store front photo, Aadhaar card, PAN card, shop license and chosen payout details. Owner contact information, the full address, document images and payout details are encrypted by the backend before database storage. Store summary information and the time and version of your Seller Terms acceptance are also saved. Registration starts as pending and does not activate a store. Signing out does not delete a submitted registration.",
    },
    {
      title: "Information you provide",
      body: "When you sign in, ZippCart uses your mobile number to identify your account. You can add a full name, email address and profile photo. Saved delivery addresses include the recipient's name, phone number and address details.",
    },
    {
      title: "Your shopping activity",
      body: "The app stores your cart, quantities, favourites and saved orders so you can return to them. Order records include the selected products, prices and delivery address supplied at checkout.",
    },
    {
      title: "Optional location sharing",
      body: "When a delivery address form uses location-based autofill, ZippCart sends your current coordinates through its backend to LocationIQ to look up nearby address details. You can instead enter your address manually. Separately, with your permission, ZippCart can save a fresh device location, its accuracy and capture time at checkout to help with delivery. It is saved securely with the order and can be viewed by the order admin. Order locations are retained with order records unless you delete your account, which removes them. You can deny location permission and still place an order. The app does not capture location on startup or track location in the background. You can revoke location permission in device settings; this stops future capture but does not delete previously saved order locations. Latest-location records saved by older app versions expire after 30 days.",
    },
    {
      title: "How information is used",
      body: "Account information supports sign-in and your profile. Shopping information supports your cart, saved addresses, checkout and order history. The service also records operational request logs to help diagnose errors.",
    },
    {
      title: "Device storage",
      body: "The app remembers whether you have completed the introduction on this device. Account sessions let you stay signed in. Shopping and profile records are stored by the account backend; clearing device storage does not delete these account records.",
    },
    {
      title: "Crash diagnostics",
      body: "Release builds use Sentry to help diagnose crashes. Diagnostic reports can include app and operating-system versions, device details and crash stack traces. JavaScript reports filter out request and user context and remove error-message text. Native crash reporting is also enabled; its data handling follows the SDK and project configuration. Session replay, screenshots and view-hierarchy capture are disabled.",
    },
    {
      title: "Reviews, reports & blocked authors",
      body: "Product reviews and seller replies are visible to other shoppers. Reports are sent to moderators with the selected reason and your account identifier to help prevent abuse. Blocking an author hides their reviews and seller replies from your signed-in account without changing what other shoppers see. You can manage blocked authors in the reviews section. Blocking preferences are stored with your account and removed when that account is deleted.",
    },
    {
      title: "Profile photos",
      body: "Choosing a profile photo opens your device's image picker. The selected image is resized and sent to the backend to save with your profile. You can replace or remove it from your profile.",
    },
    {
      title: "Account storage & your choices",
      body: "Signed-in profile and shopping records are stored by the backend used by ZippCart. You can edit your name and email, remove your profile photo, and manage saved addresses and favourites in the app. You can request account deletion from the account menu after verifying your phone number. Deletion removes your profile, saved addresses, cart, favourites, device tokens, sessions, reviews and return photos. Completed order records are retained for service records after personal delivery details and captured location are removed. Deletion is unavailable while orders or returns are unresolved; store accounts must contact support.",
    },
    {
      title: "Payments & future changes",
      body: "UPI payments are not active in this version, and the app does not ask for a UPI PIN or card details. This policy will need to reflect any new data handling when additional services become available.",
    },
  ],
};
