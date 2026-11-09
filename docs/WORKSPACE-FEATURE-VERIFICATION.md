# Current workspace feature verification

2026-11-08. All business screens use React DOM and Tailwind; Admin and Seller feature folders remain separate. Results refer to disposable local MongoDB fixtures, not Atlas or physical devices. The current [report](SECURE-WORKSPACE-REPORT.md) identifies configuration and acceptance blockers. The earlier [native-to-DOM parity ledger](PHASE-2-PARITY.md) retains exact original native counterparts; its OTP-login rows are superseded by the password-only policy below.

Each browser scenario runs in desktop Chromium, desktop Firefox, Android Chromium emulation and iPhone WebKit emulation. The final [per-scenario evidence](workspace-browser-results.json) records actual outcomes for each project; a scenario's passing result applies only to its asserted steps. Runtime/image/print/email-provider/device limitations are not inferred from a viewport test.

## Admin

| Functionality | Current implementation | Acceptance coverage |
| --- | --- | --- |
| Analytics periods, commission, order/store queues, URL filters, reload/back-forward | `web/src/features/admin/overview/overview-screen.tsx`; `monthly-commission.tsx`; `analytics-api.ts` | `web/tests/acceptance/admin.spec.ts`: overview period, queue links and browser history |
| Store lists, pagination, private documents, revisioned approval/rejection, active controls | `web/src/features/admin/stores/stores-screen.tsx`; `store-detail.tsx`; `stores-api.ts` | `admin.spec.ts`: store review/private documents/active controls; `pagination.spec.ts` |
| Seller invitations with email, temporary password, identity reuse and duplicates | `web/src/features/admin/sellers/create-seller-screen.tsx`; `sellers-api.ts`; `invitation-model.ts`; `backend/src/admin/services/seller-invitation.service.js` | `workspace-security.spec.ts`: full invitation/onboarding; concurrent idempotent invitations and customer-history preservation |
| Product moderation, rejection reason, exact revision, stale decision recovery | `web/src/features/admin/products/products-screen.tsx`; `product-detail.tsx`; `products-api.ts` | `admin.spec.ts`, `catalogue.spec.ts`, `pagination.spec.ts` |
| Shipping queues/search/date filters, details and location | `web/src/features/admin/shipping/shipping-screen.tsx`; `shipping-api.ts`; `order-detail.tsx` | `admin.spec.ts`: search/date/queues/details; `pagination.spec.ts` |
| Labels, QR and downloaded PDF | `web/src/features/admin/shipping/label-screen.tsx`; `label-pdf.ts`; `label-html.ts` | `admin.spec.ts`: label/QR/PDF bytes; physical printing/OS sharing remain unverified |
| Attention/stock-issue decisions | `web/src/features/admin/shipping/resolve-issue.tsx` | `workflows.spec.ts`: existing Attention workflow |
| Dispatch settings validation and persistence | `web/src/features/admin/shipping/dispatch-settings.tsx` | `admin.spec.ts`: invalid/valid settings and persisted contract |
| RTO state changes, history, receipt, COD completion and safe restocking | `web/src/features/admin/shipping/rto-screen.tsx`; `rto-actions.tsx`; `rto-history.tsx`; `backend/src/rto/rto.service.js` | `workflows.spec.ts`: complete COD RTO; `backend/tests/rto-bson.test.js` and `backend/tests/rto-workflow.test.js` |
| Support conversations, evidence, pickup, inspection, exchanges, disputes, deadlines, closure and refunds | `web/src/features/admin/support/case-screen.tsx`; `case-actions.tsx`; `conversation.tsx`; `evidence-photos.tsx`; `action-model.ts`; `support-api.ts` | `support-branches.spec.ts`, `workflows.spec.ts`: stage/permission workflows; original-payment refunds remain gateway-controlled |
| Earlier return history remains read-only | `web/src/features/admin/support/legacy-screen.tsx`; `legacy-api.ts` | `admin.spec.ts`: no legacy mutation controls |
| Earnings, settlement filters, cash collections and idempotent Seller payouts | `web/src/features/admin/earnings/earnings-screen.tsx`; `record-payment.tsx`; `earnings-api.ts`; `web/src/lib/earnings/` | `workflows.spec.ts`: collections/payout idempotency; `pagination.spec.ts`: statement periods/pages/filter reload |
| Review moderation and audit | `web/src/features/admin/reviews/reviews-screen.tsx`; `reviews-api.ts` | `admin.spec.ts`: moderation/history; `pagination.spec.ts` |
| Inbox, pagination and owned Admin order navigation | `web/src/features/notifications/notifications-screen.tsx` | `admin.spec.ts`: actual order detail, `pagination.spec.ts`; existing polling retained, browser push subscription is unsupported by the backend |

## Seller

| Functionality | Current implementation | Acceptance coverage |
| --- | --- | --- |
| Approved/active-store gate, ownership, availability, dashboard queues and payout summary | `web/src/features/seller/session/seller-access.tsx`; `web/src/features/seller/home/home-screen.tsx`; `web/src/features/seller/earnings/payout-overview.tsx` | `seller.spec.ts`: availability, ownership and notification links; `auth.spec.ts`: role boundaries |
| Mandatory first password change and existing onboarding | `web/src/features/auth/password-settings.tsx`; `web/src/features/seller/store/registration-form.tsx`; `use-store-registration.ts`; `registration-model.ts` | `workspace-security.spec.ts`: first-change API gate, old-password denial, prefill, pending denial and Admin approval |
| Registration steps, locality/pincode, four real document inputs, payout fields and Seller terms | `web/src/features/seller/store/registration-form.tsx`; `document-upload.tsx`; `store-api.ts` | `registration.spec.ts`, `workspace-security.spec.ts`: validation/documents/consent; physical picker/HEIC remains unverified |
| Genuine proof for registering a different owner | `web/src/features/seller/store/owner-phone-verification.tsx` | `registration.spec.ts`: existing ownership OTP proof; this is not workspace login or password recovery |
| Rejected application correction and resubmission | `web/src/features/seller/store/store-screen.tsx`; `use-store-registration.ts` | `store-review.spec.ts`: bank validation, corrections and unapproved status |
| Approved-store detail/document editing and proposed-change review | `web/src/features/seller/store/store-screen.tsx`; `registration-form.tsx`; `store-api.ts` | `seller.spec.ts`, `store-review.spec.ts`: owner identity preserved, live details unchanged until Admin review |
| Catalogue status/search/pagination, archive, restore and delete | `web/src/features/seller/products/products-screen.tsx`; `use-products.ts`; `use-product-lifecycle.ts`; `product-api.ts` | `seller.spec.ts`, `pagination.spec.ts` |
| Create/edit product, decimal prices, variants, stock and pending review | `web/src/features/seller/products/product-form.tsx`; `product-editor.tsx`; `product-model.ts`; `use-product-editor.ts` | `seller.spec.ts`, `catalogue.spec.ts`; web validation regressions |
| Color/size inventory and stale-update protection | `web/src/features/seller/products/inventory-screen.tsx` | `catalogue.spec.ts`: variant quantities and concurrent stock revision rejection |
| Sequential browser photos and safe upload failure handling | `web/src/features/seller/products/product-photos.tsx`; `web/src/lib/media/` | `catalogue.spec.ts`; `web/tests/unit/dom-upload.test.cjs`: previous photos preserved, bounded JPEG preparation, no replay after timeout/server error |
| Owned orders, queue/search/pagination/deep links, viewed markers, stock issues and handover | `web/src/features/seller/orders/orders-screen.tsx`; `order-detail.tsx`; `owned-order.ts`; `stock-issue.tsx`; `orders-api.ts` | `seller.spec.ts`, `pagination.spec.ts`, `workflows.spec.ts`; foreign order IDs rejected |
| Seller RTO receipt, inspection and restocking | `web/src/features/seller/orders/rto-panel.tsx`; `web/src/lib/api/rto-api.ts` | `workflows.spec.ts`: complete COD RTO and quantity-safe stock restoration |
| Review replies with policy acceptance | `web/src/features/seller/reviews/reviews-screen.tsx`; `reviews-api.ts` | `seller.spec.ts`: policy required before a real reply |
| Private earnings, statement periods/filters/pages and read-only payouts | `web/src/features/seller/earnings/earnings-screen.tsx`; `payout-overview.tsx`; `web/src/lib/earnings/` | `seller.spec.ts`, `pagination.spec.ts`; no Seller payout-write capability introduced |
| Seller inbox/order navigation and responsive logout | `web/src/features/notifications/notifications-screen.tsx`; `web/src/components/workspace-layout.tsx`; `web/src/features/auth/logout-button.tsx` | `seller.spec.ts`, `auth.spec.ts`: actual owned destination, mobile logout and revoked session |

## Shared authentication and browser boundaries

| Functionality | Implementation | Acceptance coverage |
| --- | --- | --- |
| Phone/password login, no privileged OTP, real server role verification | `web/src/features/auth/login-screen.tsx`; `web/src/proxy.ts`; `backend/src/shared/services/workspace-password.service.js`; `session-account.js`; `backend/src/middlewares/auth.middleware.js` | `auth.spec.ts`, `workflows.spec.ts`: correct/wrong password, protected routes/APIs, OTP customer scope and throttles |
| HttpOnly cookies, origin protection, refresh, session restoration, logout and cross-tab identity changes | `web/src/lib/api/client.ts`; `web/src/features/auth/auth-provider.tsx`; `backend/src/utils/auth-cookies.js`; `tokens.js` | `auth.spec.ts`: actual cookie headers, JavaScript invisibility, real cross-site 403, refresh and logout; Windows WebKit SameSite inspector limitation explicitly annotated |
| Current-password change and all-session revocation | `web/src/features/auth/password-settings.tsx`; `backend/src/shared/repositories/user.repository.js` | `workflows.spec.ts`, `workspace-security.spec.ts` |
| Recovery email enrollment/replacement and explicit single-use confirmation | `web/src/features/auth/recovery-email-settings.tsx`; `recovery-link-screen.tsx`; `backend/src/shared/services/password-recovery.service.js` | `workspace-security.spec.ts` for both roles: unverified refusal, current-password checks, old-channel preservation and confirmation/replay boundaries |
| Verified-email Forgot Password, concurrent reset consumption and revocation | `web/src/features/auth/forgot-password-screen.tsx`; `recovery-api.ts`; `backend/src/shared/repositories/password-recovery.repository.js` | Both recovery browser scenarios plus `backend/tests/password-recovery.test.js`; real provider/inbox delivery remains unconfigured |
| Lazy role modules, browser history and no native runtime | `web/src/app/`; `web/src/features/admin/`; `web/src/features/seller/` | `auth.spec.ts`: login script graph; `admin.spec.ts`: reload/history; `web/tests/phase-2-contracts.test.mjs`: import graphs and role separation |
| Customer OTP and customer history preserved | Existing native customer frontend unchanged; `backend/src/shared/services/auth.service.js`; `backend/src/shared/services/session-account.js` | Real API OTP login, customer-only role, original orders after invitation identity reuse, reviewer/customer unit regressions; installed Android app not tested |

## Seller account management follow-up

The [Seller website report](SELLERS-WEBSITE-REPORT.md) records the later login investigation, account list and password visibility changes. Its results distinguish the existing local account's unverified personal password from passing owned-fixture workflows.

| Feature | Exact implementation | Verification |
| --- | --- | --- |
| Admin Seller accounts before Store submission | `web/src/app/admin/sellers/page.tsx`; `web/src/features/admin/sellers/sellers-screen.tsx`; `backend/src/admin/repositories/sellers.repository.js` | `web/tests/acceptance/sellers.spec.ts`: create, immediate listing, search, account/onboarding filters and mobile overflow; `backend/scripts/verify-local-sellers.js`: existing local record, fields, pagination and literal search |
| Seller detail and verified recovery action | `web/src/app/admin/sellers/[id]/page.tsx`; `web/src/features/admin/sellers/seller-detail.tsx`; `backend/src/admin/services/sellers.service.js` | Real verified enrollment/reset browser scenario; DTO and unverified-channel unit tests in `backend/tests/sellers.test.js`; Seller access denied |
| Password-manager and visibility parity | `web/src/components/password-field.tsx`; `web/src/features/auth/login-screen.tsx`; `password-settings.tsx`, `recovery-link-screen.tsx`, `recovery-email-settings.tsx` in that auth directory; `web/src/features/admin/sellers/create-seller-screen.tsx` | DOM values changed without React events, eye toggles, first password change, logout and re-login in `web/tests/acceptance/sellers.spec.ts` |

**Native cleanup remains NO-GO.** Local acceptance does not establish real email delivery, production credential/index/hosting readiness, gateway behavior or physical browser compatibility.
