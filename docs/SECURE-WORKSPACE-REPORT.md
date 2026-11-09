# Secure Admin/Seller workspaces and RTO fixes

2026-11-08. Current implementation and acceptance record. **Native cleanup remains NO-GO.** The Phase 2 documents describe the earlier baseline and are historical where this report changes authentication, invitations or acceptance results.

Follow-up: [Create Seller code 20 investigation and atomic persistence fix](CREATE-SELLER-FIX.md). The running development backend was confirmed to use standalone `zippcart_local`; the focused follow-up tests cover that topology. The 156-case results below predate that repository change.

Later follow-up: [Seller login, account list and password visibility report](SELLERS-WEBSITE-REPORT.md). Its evidence covers the subsequent account-management APIs and UI. The original 156-case results below remain a historical record.

## Approved scope and database boundary

The user authorized backend RTO/authentication changes, password-only Admin/Seller login, Admin seller invitations, first-login password changes and verified email recovery. They selected invitation followed by the existing Seller onboarding and explicitly approved the disposable local MongoDB fixture harness. They did **not** approve modifying real production records, deployment, pushing or native cleanup.

No Atlas connection or production write was performed. The current workspace configuration still targets loopback development MongoDB; it was not replaced with a production URI. The application reuses the existing `User`/`Store` models, collections, role resolution and owner relationships. There is no new production database or Seller collection. Production continues to use the already configured backend database; the web client talks to the API and never receives database credentials. API URLs now permit HTTPS remote backends while allowing HTTP only on loopback.

Invitation/onboarding data is saved in the existing user until a real store application is submitted. The existing Store schema still requires its original documents, payout details and consent; none are fabricated. New private User fields support passwords, first-change state, encrypted invitation details and recovery verification. These fields are additive; normal customer profile email and historical orders are preserved.

The [authorized backend path list](workspace-authorized-backend.json) records why the old Phase 2 all-backend-unchanged assertion no longer applies. Its original checksum manifest is preserved. All **747 original native files** and unrelated protected backend files remain unchanged. New/rewritten/moved/removed paths are listed in [the change inventory](workspace-files.json).

## Root causes and fixes

### RTO HTTP 500

The four browser failures reproduced one backend defect. `structuredClone(order.rto)` stripped the BSON ObjectId prototype from lean MongoDB records. Mongoose then could not cast `requestedBy` and other actor identities back to ObjectIds when saving. Earlier mocks stored string IDs, so they missed the failure.

`backend/src/rto/rto.service.js` now clones recovery records through the BSON EJSON implementation already supplied by Mongoose. It preserves ObjectIds and Dates and leaves the loaded optimistic-concurrency snapshot unchanged. The fix covers Admin transitions, Seller receipt and Seller inspection. No settlement, inventory, payment or RTO state rules were relaxed.

`backend/tests/rto-bson.test.js` exercises all three cloning paths with actual BSON IDs and Mongoose schema validation. `backend/tests/rto-workflow.test.js` retains eleven state/quantity/ownership/concurrency regressions. The browser workflow in `web/tests/acceptance/workflows.spec.ts` exercises actual MongoDB receipt, transfer, Seller inspection, COD completion and stock restoration. Final per-engine results are recorded below.

### Windows WebKit cookie assertion

A minimal HTTP fixture reproduced the failure independently of ZippCart. Chromium 158.0.8127.18 and Firefox 159 reported/enforced SameSite=Lax. The bundled Windows WebKit 27.2 reported SameSite=None and sent a cross-site subrequest cookie despite an explicit SameSite=Lax response header.

This is a platform limitation accounted for in [Playwright's own cookie tests](https://github.com/microsoft/playwright/blob/main/tests/library/browsercontext-cookies.spec.ts): their Windows WebKit expectations use None where other engines use Lax. It is not evidence that the ZippCart backend sent the wrong attribute.

`web/tests/acceptance/auth.spec.ts` now asserts the platform-specific inspector result and annotates this limitation. It still strictly checks the real `Set-Cookie` headers for HttpOnly/SameSite=Lax, verifies JavaScript cannot read the token, and makes a real unsafe cross-site browser request that the API must reject with HTTP 403. Session restoration/logout/revocation checks remain. No production cookie setting was weakened. Production cookies retain the existing Secure/HttpOnly/SameSite=None policy and origin protection. Windows WebKit emulation is not actual Safari certification.

## Authentication and authorization

- Web login is phone + password only for both roles. OTP login controls and unused web OTP-login implementation were removed. Customer OTP request/verify remains available to the Android app, with the existing delivery/attempt/cooldown protections.
- Password login verifies the existing live identity and its server-derived roles. Legacy Admin password hashes remain readable; successful password changes write the generic private password hash and remove the legacy field. Hashing uses the existing salted scrypt profile with bounded parameters.
- Signed access/refresh tokens now carry the authentication method. OTP and older tokens are **customer-only**, even for a phone that owns a store or is the configured Owner. Refresh cannot upgrade that scope. A frontend role flag cannot grant access.
- Approved Seller/Admin APIs require the live account role; store ownership and active/approved checks remain authoritative. Approved-store private details/documents/edits/availability are also password-gated on the shared Store routes. Customer application/status/correction behavior is retained for non-approved registrations.
- The Owner's account-deletion prohibition also checks the configured identity, so reducing an OTP session to customer scope cannot bypass that protection. Customer account deletion still uses its original OTP proof.
- Temporary-password users are denied business APIs and redirected to `/account/password`. Only session inspection, password change and logout are available before changing the password. Client routing and the API independently enforce this condition.
- Password changes require the current password and a different replacement of 12-128 characters. They atomically update the hash, clear first-change state, revoke all sessions and increment authVersion. Existing access and refresh tokens then fail server checks.
- Login/change/recovery/invitation limits use the existing Mongo-backed rate limiter. Existing origin guards, HttpOnly cookies, refresh rotation, cross-tab cookie locks and account-scoped cache/request cancellation remain.
- Configured non-production reviewer Admin/Seller identities also need independently provisioned password hashes for workspace access; their signed reviewer marker and existing synthetic-data restrictions are retained. Their old OTP/code sessions cannot grant workspace roles. Customer reviewer OTP stays supported. No real reviewer credential was provisioned or changed.

Relevant files: `backend/src/shared/services/workspace-password.service.js`, `password-hash.js`, `session-account.js`, `auth.service.js`; `backend/src/utils/tokens.js`; `backend/src/middlewares/auth.middleware.js`, `store.middleware.js`; `web/src/proxy.ts`; `web/src/features/auth/login-screen.tsx`, `session-boundary.tsx`, `password-settings.tsx`.

## Admin Create Seller and onboarding

`/admin/sellers/new` has a responsive Tailwind form for Seller name, phone, email, store name, address, category/custom category and initial password. Admin reaches it from Stores. The initial password requires at least twelve characters and is cleared from component state after the request. Passwords are not returned or emailed.

POST `/api/v1/admin/sellers` requires the configured Owner's password-authenticated Admin session. It:

1. Strictly validates inputs and checks the actual existing unique-phone index before creating any record. It never creates indexes automatically.
2. Reuses a matching ordinary customer identity where eligible, retaining its profile and historical records. It refuses existing stores/workspace credentials and configured Owner/reviewer phones. It never resets an existing password through Create Seller.
3. Uses atomic single-document persistence, the existing unique phone constraint and a request key. Concurrent identical retries return the same identity; changed payload/password or a different request key cannot overwrite credentials.
4. Stores only a salted password hash, requires first-login change, revokes old sessions, and saves private invitation details using the existing AES-256-GCM mechanism bound to the owner. Email starts explicitly unverified.
5. Attempts a verification email through the configured transport. The response distinguishes provider acceptance, failure and missing configuration; creating the account never falsely marks email verified. A retry does not create a second account or replace credentials.

After the first password change, the Seller signs in again and reaches the existing registration flow. The supplied name/store/address/category are prefilled, and the invited login phone stays fixed. Locality, pincode, four document photos, actual payout details and Seller consent must still be supplied. Registration remains pending/inactive until existing Admin approval. Only then do all normal dashboard features become available. No fake terms acceptance, documents, payout account or automatic store approval is introduced.

Admin files: `web/src/features/admin/sellers/`, `web/src/app/admin/sellers/new/page.tsx`; `backend/src/admin/controllers/seller-invitation.controller.js`, `services/seller-invitation.service.js`, `repositories/seller-invitation.repository.js`, `validators/seller-invitation.validator.js`. Seller onboarding remains in `web/src/features/seller/store/`. Shared password screens live in `web/src/features/auth/`, not inside the other role's feature tree.

## Verified email recovery

Recovery uses a separate private address/channel; an editable customer profile email is never trusted as verified recovery identity.

- Initial invitation email is unverified. Settings allows Admin/Seller to add, update or resend recovery-email verification, requiring the current password. An old verified address remains active until its replacement is confirmed.
- A 256-bit random verification secret is sent only through the email transport. The database stores its SHA-256 hash, target address and thirty-minute expiry. Only the latest pending link can be consumed, once, through an atomic conditional update. Opening the page alone does not verify the email; the recipient confirms the action.
- Forgot Password accepts a phone number and returns a generic conditional response for unknown/unverified accounts. Recovery uses only a verified address. Request/reset/verification have IP and account limits. Provider timing is separated from the public request and a response floor reduces account-enrollment timing differences.
- Reset links use independent 256-bit secrets with fifteen-minute expiry, hashed storage, authVersion binding and atomic consumption. Stale, reused, tampered, expired and concurrently consumed links fail. A successful reset revokes all sessions, clears first-change state and returns the user to phone/password login. It does not automatically sign in.
- Links put the secret in the URL fragment, not a server query string. The web page immediately removes the fragment, keeps it only in memory, and submits it in a POST body. Referrer-Policy remains no-referrer. Tokens, provider credentials and passwords are never returned in normal API responses or logged. Sensitive database/provider exceptions receive sanitized diagnostics.
- This follows the core token/channel/session boundaries described in the [OWASP recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). No security questions, phone-only recovery, OTP fallback or unverified-email reset was added.

New routes are under `/api/v1/auth/password`: GET `/settings`, GET `/invitation`, POST `/recovery/email`, `/recovery/verify`, `/recovery/request`, `/recovery/reset`. Core login/change continue at their existing paths. Routes/logic/persistence are separated in `backend/src/shared/routes/password-recovery.routes.js`, `services/password-recovery.service.js`, `repositories/password-recovery.repository.js`. Web screens/API are in `web/src/features/auth/recovery-*` and `forgot-password-screen.tsx`; public pages are `/forgot-password`, `/verify-email`, `/reset-password`. Account Settings is available to pending invitees as well as approved dashboard users.

A successful reset also cancels pending recovery-email replacements, preventing a link enrolled before recovery from changing the channel afterward. Normal authenticated password changes cancel pending replacements too; the initial invitation verification link is preserved during mandatory first-password setup. The browser recovery scenarios exercise replacement-link rejection against actual MongoDB after a reset.

### Real provider setup required

The first real adapter supports Resend; `disabled` is the default. The adapter is isolated so a different provider can be added without changing role or recovery rules. Configure these **backend-only** variables on the existing service:

| Variable                   | Required value                                                             |
| -------------------------- | -------------------------------------------------------------------------- |
| `WORKSPACE_EMAIL_PROVIDER` | `resend` after setup; otherwise `disabled`                                 |
| `WORKSPACE_EMAIL_ENDPOINT` | Resend's HTTPS send-email endpoint, `https://api.resend.com/emails`        |
| `WORKSPACE_EMAIL_API_KEY`  | A private sending-only provider API key; never a NEXT_PUBLIC/Expo variable |
| `WORKSPACE_EMAIL_FROM`     | An address on your verified sending domain                                 |
| `WORKSPACE_WEB_ORIGIN`     | Exact HTTPS website origin, also allowed by existing `CLIENT_ORIGIN`       |

Verify a domain you control and install the required DNS records in the provider. Disable open/click tracking for recovery emails. See [Resend verified-domain setup](https://resend.com/docs/dashboard/domains/introduction) and [send-email API](https://resend.com/docs/api-reference/emails/send-email). No provider account, DNS, secret or production origin was configured automatically. `backend/.env.example` documents the fields without credentials.

Without configuration, addresses can be saved only as unverified; the UI clearly reports that verification delivery is unavailable. Forgot Password fails uniformly with delivery unavailable. A provider-accepted message is not claimed as inbox delivery. Real delivery, spam-folder behavior and link opening must be verified after approved configuration. Public reset requests use best-effort asynchronous delivery, with no automatic retry that might send duplicate messages; users can request a new link after a failure. No durable email outbox is claimed.

## Production activation and existing identities

This work does not silently provision or reset real accounts. Before activating the new password policy, existing Admin/Seller identities must have working passwords; otherwise their old OTP sessions will retain customer access only. The earlier local Admin setup is not proof that an Atlas Admin hash exists. Real production credential/enrollment/index state was not inspected or changed.

The existing backend issues host-only HttpOnly cookies, and `web/src/proxy.ts` needs that cookie on the website request. Production must therefore serve the website and its browser-facing `/api/v1` endpoint on the **same public hostname**, with the existing hosting/reverse proxy routing `/api/v1` to Express. Use that hostname in `NEXT_PUBLIC_API_URL` and the exact website origin in the backend allowlist. Separate API/web subdomains or unrelated domains are not supported by the current cookie/proxy topology merely because both use HTTPS. No hosting route, shared-domain cookie or third-party-cookie workaround was configured. The fixture uses one loopback hostname with different ports; real HTTPS/hosting integration remains an activation blocker.

`backend/scripts/setup-workspace-password.js` is an operator-only **initial provisioning** command for an existing configured Owner or an existing store owner with no password hash. It uses the existing production database configuration, disables automatic index/collection creation, verifies the actual phone-uniqueness index and refuses alternate/local/reviewer targets. It never creates an identity, store or database and never overwrites an existing hash. Default mode is read-only. Phone/password entry is hidden; credentials are never arguments or output. Applying requires `--apply` and the explicit `WORKSPACE_BOOTSTRAP_APPROVED=true` environment opt-in after user approval. This command was not run against Atlas, even in dry-run mode.

The local `web/scripts/setup-admin-password.mjs` remains local-only and now refuses both legacy and generic existing password hashes. Subsequent changes belong in authenticated Settings or verified recovery, not provisioning scripts. Missing recovery enrollment cannot be bypassed with the customer's editable profile email or OTP.

## Feature coverage

The [current feature-by-feature verification ledger](WORKSPACE-FEATURE-VERIFICATION.md) lists Admin, Seller and shared behavior with exact implementation/test paths. Final per-engine outcomes are recorded in the acceptance evidence below. It supersedes the earlier ledger's OTP-login mappings while preserving all existing business mappings.

## Regression and browser acceptance

Final complete acceptance: **156 passed, zero failures, zero skipped, zero flaky tests**. No retries or expected-failure annotations were added. [Per-scenario evidence](workspace-browser-results.json), [verification summary](workspace-verification.json).

| Browser project | Passed | Failed |
| --- | ---: | ---: |
| Desktop Chromium | 39 | 0 |
| Desktop Firefox | 39 | 0 |
| Android Chromium emulation | 39 | 0 |
| iPhone WebKit emulation on Windows | 39 | 0 |

All four RTO cases from the earlier migration failure set now pass. The cookie scenario passes with the documented Windows WebKit inspector limitation, strict HTTP attributes and a real cross-site rejection; no browser security policy was weakened.

- Backend full unit suite: **436 passed, zero failures, 26 existing opt-in integration checks skipped** (462 total). [Sanitized results](workspace-backend-unit-results.json).
- Web/source suite: **17 passed, zero failures**, including protected-source integrity, strict role separation, lazy login, API/validation contracts and upload/read-retry boundaries.
- The normal optimized Next.js build passed. A short-lived loopback preview returned HTTP 200 for login/Forgot Password and redirected anonymous Admin/Seller/Account Settings requests to login (HTTP 307), without creating a backend session. The owned preview was then stopped.
- Strict TypeScript, Prettier and the source-size guard passed (774 backend/native source files, each below 500 lines).
- The public recovery form's server-rendered input and submit button were confirmed disabled before hydration; its actual submission succeeds in all four engines.
- Source audit: **181 TypeScript modules, 86 API call sites, zero React Native/Expo/navigation imports or dependencies**; largest source file 414 lines. No runtime dependency was added.
- All **747 protected native files** and unrelated protected backend sources still match their starting checksums. Only 20 existing protected backend source files changed under the authorized scope, alongside the new focused modules listed in the change inventory.
- The synthetic local login loaded 12 JavaScript requests (528,185 decoded bytes) in every engine, with role/PDF/QR modules absent. [Performance observations](workspace-performance.json) are local fixture measurements, not device/network performance certification.

The real Express application runs with the approved disposable local replica-set database. Email delivery is an injected test transport captured in memory behind the authenticated test controller, not a fake verification authority; the actual enrollment/hash/expiry/reset APIs are used. Provider adapter behavior has separate unit tests. No live email/SMS/payment provider or production data is contacted. Credentials are random process-only values. Trace/video/credential screenshots and automatic failure DOM snapshots remain disabled.

Desktop Chromium/Firefox, Android Chromium viewport emulation and iPhone WebKit viewport emulation are separate projects. Actual Android testing was deferred by the user; no iPhone is available. Device browser, camera/gallery/HEIC, OS share, physical printing, real email delivery and production integration remain unverified. Existing gateway/refund limits are preserved; successful local COD RTO is not production gateway-refund proof.

### Additional failures found during regression

The first full workspace run recorded 150 passed and six failures; [the sanitized initial evidence](workspace-browser-initial.json) is retained. Two recovery-form failures were caused by pre-hydration input: the public form was editable before React attached change handlers. It now disables input/submission until mounted and validates the phone locally. A pagination helper could click again before the response body was rendered; it now waits for the rendered list to change. One Android setup timeout did not reproduce in either the targeted or final full rerun; no separate application root cause is claimed. Two Windows WebKit engine diagnostics appeared when tests started another hard navigation while data was still loading. Navigation cancellation can surface as an access-control diagnostic, as discussed in [the upstream report](https://github.com/microsoft/playwright/issues/43120). The affected tests now verify the requested analytics response and actual order detail before leaving; browser-error assertions remain strict. The [focused run](workspace-browser-focused.json) retained one such diagnostic before those final synchronization changes. Final four-engine results are reported separately above, including any remaining failures.

## Local start and cleanup verdict

```powershell
cd C:\Users\User\Desktop\ZippCart\web
npm run build
npm start -- --port 3100
```

Use the existing configured backend. `npm run dev:api` is still loopback/local-only; it does not switch to Atlas. Do not copy production database secrets into frontend variables. The owned preview/test ports (3100, 3200, 4500, 4501, 27139) are closed. All owned disposable MongoDB directories and the temporary backend-test log were removed; existing unrelated services were left alone.

**Native cleanup: NO-GO** until full acceptance, approved production readiness, verified email delivery and required device checks are complete, followed by explicit cleanup approval. Code/test readiness is not deployment or evidence that real production credentials were changed.
