# Seller login and Admin account management

Local verification, 8 November 2026. No Atlas connection, deployment, push, native cleanup or existing Seller password reset was performed.

## Login investigation and limits

The existing local Seller has a canonical ten-digit phone, an active invitation and a structurally valid scrypt password hash. The mandatory first-change flag is already cleared; the credential version was incremented. An invited Seller can authenticate before Store approval, while the existing onboarding gate still restricts business APIs. There is no evidence of a failed password write, duplicate identity, corrupt hash format or approval requirement preventing password login.

The reported HTTP 401 is not a password-hash comparison result. We have not received the existing Seller's password, and cannot claim to have verified it against the saved hash. No existing credentials were overwritten to make a test pass.

A browser regression reproduced a concrete input defect: a password manager can update an input's displayed DOM value without updating React state. The former forms submitted that state, potentially saving or submitting a different password. Login, password change, reset, recovery-email authentication and Seller creation now read their submitted password fields through `FormData`. The shared visibility control preserves the browser value across eye toggles, including when parent state is stale. This fixes the reproduced defect; it is not proof that autofill caused the individual's reported attempt.

The server now records only a stable rejection category (`workspace_password_mismatch` or `workspace_password_account_unavailable`). Neither event contains an identity, credential, hash or token; the browser still receives a generic 401.

For an optional read-only check of the actual existing Seller, run:

```powershell
cd C:\Users\User\Desktop\ZippCart\backend
node scripts/check-workspace-password.js
```

Both inputs are hidden. It refuses non-development, remote or non-`zippcart_local` configurations and never changes records. Report only the `passwordMatchesStoredHash` boolean, never the password. A mismatch must be resolved by the user with the correct password or the existing verified-email recovery process, rather than an unauthorized administrator reset.

## Requested behavior

| Area | Implementation and verification |
| --- | --- |
| Seller accounts before onboarding | `/admin/sellers` reads existing Users with invitations or linked Stores. Creation invalidates the list and links directly to the new account. It does not invent approved Stores. |
| Requested columns | Seller name, phone, email and verification status, Store name, category, address, password/account readiness, onboarding status and creation date. |
| Search and filters | Literal, bounded search across phone, email, profile name and Store name; account and onboarding filters; URL state and pagination. Encrypted legal/invitation names and addresses are displayed after authorized decryption, but are not full-text searchable. |
| Details and account actions | Separate detail route, verified-email reset request with confirmation, and links to existing Store review/activation controls. No account deletion, password disclosure or additional suspension policy was introduced. |
| Password recovery | Sends a request only through the existing independently verified recovery channel; unverified channels return 409. Reset links are single-use and never returned by the Admin API. |
| Password visibility | Lucide eye/eye-off on login, invitation, first change, Settings change, recovery email authentication and reset/confirmation inputs. Hidden initially; keyboard/touch accessible; toggles preserve entered values. Forgot Password has a phone input and no password input. |
| Authorization | Existing live Admin role gate, reviewer exclusion, Origin checks and no-store responses protect the new endpoints. Seller/customer access cannot obtain the list or reset another account. Store business access remains ownership- and approval-controlled. |
| Sensitive data | Explicit DTOs exclude password hashes, sessions, recovery tokens, encrypted blobs, documents and payout details. At most ten Store envelopes are fetched after pagination and only requested name/address fields are extracted. |
| Customer and native flows | Customer OTP and the existing onboarding requirements remain intact. Protected-source checks verify the original native files and unrelated backend files remain unchanged. |

## Database and storage

The configured development target is the existing standalone `zippcart_local` database on loopback. The normal API's loopback MongoDB socket was also observed during the investigation. The existing local Seller record was read successfully through the new detail API.

Creation persists the invitation, private password hash, unverified email and first-change flag in the existing `users` collection. Store submission later creates the existing `stores` record linked by `ownerId`; Store approval remains separate. Local Sellers do not appear in Atlas. No settings were switched to Atlas, and no production records were read or changed.

`backend/scripts/verify-local-sellers.js --run-owned-fixtures` creates uniquely marked temporary identities in this existing local database, runs the real Express APIs and removes only its own User/Store/rate-limit records. It refuses remote databases, suppresses credentials and providers, and verifies the pre-existing credential snapshots are unchanged. It never drops the local database or clears existing collections.

## Focused files

| Responsibility | Source |
| --- | --- |
| Seller list/detail/reset validation | `backend/src/admin/validators/sellers.validator.js` |
| Existing User/Store querying and pagination | `backend/src/admin/repositories/sellers.repository.js` |
| Safe response DTO and verified reset request | `backend/src/admin/services/sellers.service.js` |
| HTTP handlers | `backend/src/admin/controllers/sellers.controller.js` |
| Protected routes and recovery-service wiring | `backend/src/admin/routes/admin.routes.js`, `backend/src/app.js` |
| Safe login failure classification | `backend/src/shared/services/workspace-password.service.js` |
| Read-only actual-password diagnostic | `backend/scripts/check-workspace-password.js` |
| Guarded existing-local-database acceptance | `backend/scripts/verify-local-sellers.js` |
| DTO/validation/recovery regression tests | `backend/tests/sellers.test.js` |
| Admin routes | `web/src/app/admin/sellers/page.tsx`, `web/src/app/admin/sellers/[id]/page.tsx` |
| Admin-specific UI, status and API calls | `web/src/features/admin/sellers/sellers-screen.tsx`, `seller-detail.tsx`, `seller-status.tsx`, `sellers-api.ts` in that directory |
| Invitation success and cache refresh | `web/src/features/admin/sellers/create-seller-screen.tsx` |
| Dedicated navigation entry | `web/src/components/workspace-layout.tsx` |
| Shared eye control and Field integration | `web/src/components/password-field.tsx`, `web/src/components/ui.tsx` |
| Actual submitted password handling | `web/src/features/auth/login-screen.tsx`, `password-settings.tsx`, `recovery-link-screen.tsx`, `recovery-email-settings.tsx` in that directory |
| Real browser scenarios | `web/tests/acceptance/sellers.spec.ts` |
| Failed-login retry synchronization | `web/tests/acceptance/auth.spec.ts` |
| SVG icon dependency | `web/package.json`, `web/package-lock.json` (`lucide-react` 1.70.0, named imports) |

Admin-specific modules remain in `features/admin/sellers`, Seller features remain in `features/seller`, and reusable authentication/input code remains shared. No React Native dependency or component was added. Source/API inventories are regenerated in `web/docs/phase-2-files.json` and `phase-2-api-contracts.json`.

## Tests and remaining boundaries

- Guarded existing-local-database workflow: passed. Includes create, immediate account listing, read of the existing Seller detail, first change, actual saved-hash verification, old-password rejection, logout denial, new-password re-login, onboarding, approval, Seller access and Admin-API denial. Original credentials unchanged; fixtures removed.
- Backend canonical isolated regression runner: **439 passed, 27 opt-in checks skipped, zero failures** (466 total).
- Web/source regression suite: **17 passed, zero failures**. The sandboxed attempt first encountered Windows `spawn EPERM`; the permitted rerun passed.
- TypeScript, formatting, zero-native-import audit and source-size check: passed. The web audit found 187 source modules, 89 API call sites, zero native imports and a largest source file of 414 lines. All 782 checked backend/native/web source files are below 500 lines.
- New focused browser scenarios: **2 passed** in desktop Chromium. They cover DOM-only password-manager changes, all relevant eye controls, list/detail permissions, first change/logout/re-login and a verified recovery request/reset using the real APIs with an isolated test email transport.
- Complete browser regression: **163 passed, one failed** out of 164. Desktop Chromium, Firefox and Android Chromium emulation each passed 41/41; iPhone WebKit emulation passed 40/41. Both new Seller scenarios passed in all four projects. [Sanitized per-scenario results](sellers-browser-initial.json).
- The WebKit failure came from the strict browser-error fixture, after the test hard-navigated away from a failed login. Its functional cookie, authorization and logout assertions had passed; the browser reported an access-control diagnostic for the login request. The test now retries on the existing login form, avoiding that unnecessary hard navigation. Browser-error assertions, HTTP cookie checks, real cross-site rejection and server authorization remain unchanged. The revised scenario passed **12/12 checks: three repetitions in each browser project**, including WebKit. [Focused results](sellers-browser-focused.json). No new complete 164-case run after this test-only change is claimed.

The earlier interrupted run is not counted as completed acceptance. The optimized Next.js build passed. The local login loaded 12 JavaScript requests and 533,285 decoded bytes in the completed run, with no Admin/Seller/PDF/QR business modules. [Local performance observations](sellers-performance.json) are not device or network certification. [Consolidated verification](sellers-verification.json) preserves the distinction between the initial complete run and the final focused checks.

The project's `npm run test:unit` is the canonical backend regression command: it supplies isolated settings and explicit test filenames. An exploratory `npm test` invocation also discovered operational `*-test.js` scripts and failed their guards, along with configuration-dependent checks; it is not reported as a passing run. No guards were weakened to accommodate that invocation.

Real email delivery remains unavailable until the existing [provider configuration and verified-domain setup](SECURE-WORKSPACE-REPORT.md#verified-email-recovery) are supplied. Tests use an injected, in-memory transport only inside disposable acceptance fixtures; production delivery/verification is never faked. Actual Android testing was deferred, and no physical iPhone is available. Browser emulation is not physical-device certification.

The existing Seller's personal password match still requires the read-only hidden diagnostic or a successful manual login. Backend workflow tests and the reproduced browser fix are not proof of that individual credential.

**Native cleanup: NO-GO.** Physical-device acceptance, real email delivery, the outstanding personal-account check and explicit cleanup approval remain required. Nothing was deployed or pushed.

## Local commands

```powershell
cd C:\Users\User\Desktop\ZippCart\web
npm run dev:api
```

In a second terminal:

```powershell
cd C:\Users\User\Desktop\ZippCart\web
npm run dev
```

Open `http://127.0.0.1:3000`. Both commands retain the existing local configuration. Do not switch these settings to Atlas for testing.

At final cleanup, the existing website on port 3000 and backend on port 4000 remained available. The extra local helper started during the interrupted-session recovery was stopped after identifying the existing backend. Login returned HTTP 200; anonymous access to `/api/v1/admin/sellers` returned 401. Owned test ports 3200, 4500, 4501 and 27139 were closed, disposable MongoDB directories removed, and the summarized temporary unit-test log removed.
