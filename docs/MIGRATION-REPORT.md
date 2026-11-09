# Phase 1 migration report — 2026-11-07

Historical Phase 1 report. Its React Native Web implementation and fixture tests have been superseded by the React DOM conversion. See the [Phase 2 report](PHASE-2-REPORT.md) and [parity ledger](PHASE-2-PARITY.md) for current implementation, real-backend results and remaining blockers. The later authorized password capability is described in [Admin authentication](ADMIN-PASSWORD.md). Historical results below are not current acceptance evidence.

**Overall status: INCOMPLETE / BLOCKED. Native cleanup: NOT READY and NOT APPROVED.**

The separate local Next.js + TypeScript + Tailwind project exists at `C:\Users\User\Desktop\ZippCart\web`. Existing Admin/Seller code is copied into the web project and rendered through React Native Web. The workspace shell and login use Tailwind; this is not a conversion of every existing screen into DOM/Tailwind components.

## Existing features found

The [pre-implementation inventory](FEATURE-INVENTORY.md) enumerates the Admin, Seller and shared workflows. [Source provenance](source-manifest.json) records 172 native dependency files and their original SHA-256 checksums. [API call inventory](api-contracts.json) lists 100 existing API call expressions, with file/line references and dynamic expressions retained. These inventories are coverage aids, not proof of complete browser parity.

- Admin: analytics and order queues; store requests/details/private documents/approval/activation/history; product moderation and approved/submitted comparisons; shipping/search/settings/labels/dispatch/stock issues; RTO recovery; return/refund/exchange conversations and stage actions; seller earnings/collection/payout recording; review moderation/audit/safety.
- Seller: approved/active ownership gate; availability and overview; products, multi-step form, category/custom category, sizes/colors/variants/photos, moderation feedback, inventory revisions, active/archive/restore/delete controls; order preparation/packing/ready/handover/stock issues and RTO receipt/inspection; payout balances/holds/statements/accounts/history; review replies and safety; store status/edit/private documents/owner OTP/payout details and correction/resubmission.
- Shared: actual backend OTP and cookie-session flows, logout recovery, account-scoped request cancellation/cache isolation, existing notification inbox, reviewer restrictions, native customer-mode entry points.

## Migrated implementation and verified behavior

| Area | Web implementation | Verification boundary |
| --- | --- | --- |
| Routes and protection | `/login`, `/admin`, `/seller`, `/seller/application`; server-asserted role and approved/active store gates; denied users never mount privileged dashboards | Intercepted browser authentication/role fixtures; real backend still enforces ownership and authorization |
| Admin overview/navigation | Original dashboards/queues, responsive Tailwind navigation and manual refresh equivalent for native pull-to-refresh | Browser screen-load and viewport checks; domain/API contract checks |
| Store management | Original list/filter/pagination/detail/review/enable-disable/history/private-document workflows | Browser checks exercise document retrieval and reason + confirmation + expected-revision disable request |
| Product moderation | Original filters/version previews/approve/reject and concurrency behavior | Browser approval payload; source-execution regressions verify stale decisions, duplicate locking and cache invalidation |
| Seller products/inventory | Original form/validation/variants/photos/status/lifecycle; browser file picker/capture and canvas JPEG encoding | Browser edit, live-stock revision, photo upload and archive confirmation; source-execution regressions cover sizes, stock, exchange reservations, conditional deletion and lifecycle locks |
| Orders/shipping | Original queues/search/detail/settings/operations and customer/seller contacts | Browser shipping screen/settings and API search contract checks. Every fulfillment/stock-issue action has not been exercised against a real backend |
| Labels | QR preview; local PDF generation; browser download/share fallback; print opens PDF viewer | Browser QR + valid PDF download check. Nested dialogs use HTML `dialog` because the RN Web portal disappeared during Strict Mode effect cleanup. Physical print and OS share sheets remain manual |
| Returns/exchanges | Original active/history/legacy inboxes, conversation/evidence/history and stage-dependent actions | Browser return approval preserves version/client key and explicit confirmation; domain checks cover allowed states/restock bounds/original-payment refund restriction. Full lifecycle acceptance remains outstanding |
| RTO | Original admin recovery actions and seller receipt/inspection surfaces and contracts retained | Source included and compiles; full RTO workflow has not received browser or real-backend acceptance testing |
| Earnings/payouts | Original statements/holds/filters/accounts/collection and confirmed payout recording | Browser records fixture payout in paise with transfer assertion/client key; contract checks. No money is transferred by this UI or by tests |
| Reviews | Original moderation/audit/reply/policy/safety UI and APIs | Browser workspace checks and seller-policy/versioned reply; complete moderation/report/block/audit acceptance remains outstanding |
| Store application | Existing authenticated registration/status/edit/correction flows available without bypassing approved seller gate | Browser pending-access denial/rejected-correction visibility; original owner-phone proof remains required. Full registration/resubmission acceptance remains outstanding |
| Notification inbox | Existing paginated inbox and role-workspace order targets | Source retained; web push unavailable. Native device registration is never faked |
| Session/upload isolation | Existing cookie transport, refresh serialization, pending logout and cache scopes; browser preferences/markers only | Domain tests verify old-account upload cancellation and no upload fallback/replay after timeout/502. Real cookies/CORS/multiple-tab/provider delivery require local-backend acceptance |

## Missing, blocked or unverified

1. **Requested mobile number + password authentication is BLOCKED.** Read-only backend inspection found only `/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, `/auth/me`, `/auth/logout`, `/auth/mode`, and account deletion. `auth.validator.js` validates a 10-digit phone and 6-digit OTP. There is no password-login contract or password-credential verification capability. Implementing one would require forbidden backend work, so none was added. The requested password form reports BLOCKED and never transmits/stores the entered password.
2. Supported OTP sign-in is implemented separately using the existing endpoints. Real browser OTP delivery, credentialed CORS, HttpOnly cookie persistence/refresh/revocation and existing local account acceptance remain **unverified**. No real local backend or authorized test identities were configured during this work. Fake fixture responses exist only in intercepted tests.
3. **Browser push is BLOCKED** by the absence of a browser subscription/delivery backend contract. Expo device tokens are not browser subscriptions. Existing inbox and polling remain available; no new notification service or API was created.
4. Customer shopping remains in the native application. Existing customer-mode controls show a native-app handoff; there is no customer web dashboard or automatic app-launch integration. Native customer functionality was not changed.
5. OS camera capture availability, OS sharing, physical printing, other browsers and full real-backend business lifecycle parity remain unverified. Camera capture falls back to the browser's file/capture capability; PDF download is available when system file sharing is unsupported.
6. Several original workflows are source-migrated but lack exhaustive end-to-end acceptance, as listed in the table. Retaining the source is not a claim that every workflow is fully tested or that migration is complete.

## Files changed

All authored changes are confined to the new `web/` directory:

- `package.json`, `package-lock.json`, `next.config.mjs`, `tsconfig.json`, `postcss.config.mjs`, `.env.example`, `.gitignore`, `next-env.d.ts`.
- `src/app`: Next pages, global Tailwind styles, metadata and error fallback; no API route handlers.
- `src/ui`: login/OTP UI, backend-derived access gates, responsive Admin/Seller shell.
- `src/migrated`: source snapshot and browser-specific adjustments. See provenance manifest for source origins.
- `src/platform`: browser dialogs, confirmations, SVG/QR, picker/image conversion, storage, navigation, fetch, gradient, PDF print/share adapters.
- `tests`, `playwright.config.ts`, `scripts`: isolated fixture browser checks, source-execution/domain regressions, source/API inventory tools.
- `README.md`, `docs`: setup, feature inventory, provenance, API call inventory, this report.

No backend, native/customer source, existing repository configuration, production data, deployment, push, AAB or native cleanup was changed/performed. Existing unrelated workspace changes were left alone. Source-integrity tests verify the recorded native dependencies remain unchanged.

## Tests

- `npm test`: **36 passed, 0 failed** (domain/API contracts, native source integrity, upload/session safety).
- `npm run typecheck`: passed; the final production build also passed its TypeScript checks.
- `npm run build`: **passed**, including `/login`, `/admin`, `/seller`, and `/seller/application`.
- `npm run test:browser`: **37 passed, 0 failed** in the final intercepted Microsoft Edge run (3.3 minutes). Previous checks found/fixed the label modal lifecycle; fixture locators were updated for native browser dialogs.
- Backend tests / real accounts / live OTP / payments / physical print: **not run**. All API mutations in browser tests are intercepted fixture requests; no real business API receives them.

Windows sandbox process creation initially returned `spawn EPERM`. Build/test workers were then run with approved process access. This changes the execution boundary, not the test evidence or backend scope.

## Local configuration and start

Follow [README](../README.md). Install dependencies with `npm ci`, copy `.env.example` to `.env.local`, and set `NEXT_PUBLIC_API_URL` to an existing loopback test backend API root ending in `/api/v1`. The current backend must already permit the exact local web origin and credentialed cookies. Do not bypass origin checks or OTP; report incompatible configuration instead of editing backend files.

```powershell
cd C:\Users\User\Desktop\ZippCart\web
npm run dev
```

Visit `http://127.0.0.1:3000`. The API root is empty by default, and public/production API targets are rejected for this local-only phase.

## Native cleanup readiness

**NO-GO.** Resolve the requested authentication incompatibility, blocked/unsupported browser behaviors and outstanding acceptance matrix. Then obtain explicit native-cleanup approval. No existing native screen, component, service or navigation code has been deleted or altered by this migration.
