# ZippCart Phase 2 React DOM conversion

Historical baseline. The later authorized password-only login, Seller invitations, email recovery and RTO/cookie fixes are documented in [the current secure-workspace report](SECURE-WORKSPACE-REPORT.md). Results and authentication statements below describe the Phase 2 baseline, not the current code.

2026-11-08. **Implementation available locally; acceptance INCOMPLETE. Native cleanup: NO-GO.**

The Admin and Seller business screens now use Next.js App Router, TypeScript, React DOM and Tailwind. The old React Native Web screen tree and compatibility adapters have been removed from `web/` after active-route dependency checks. This does not establish complete migration acceptance: the unchanged RTO backend fails, a Windows WebKit cookie assertion is unresolved, and device/provider and some branch acceptance remain outstanding.

## Scope and integrity

- Changes are confined to `web/`. The source-integrity regression checks all **976** native/backend files recorded at the Phase 2 starting point; all checksums still match. The repository already contained unrelated changes and the earlier authorized password-authentication implementation; neither was reverted or attributed to this conversion.
- No original `frontend/` or backend file was edited, added or removed during Phase 2. No production database, configured operator account or production provider was used for mutation testing.
- No push, deployment, AAB build or native cleanup was performed.
- No Excel upload, Admin seller creation, customer shopping or other business feature was added. New browser routes expose the existing workflows.

Evidence: [protected-source inventory](phase-2-protected-sources.json), `web/tests/phase-2-contracts.test.mjs`, [current file inventory](phase-2-files.json), [retired files](phase-2-removed-files.json), [API call inventory](phase-2-api-contracts.json).

## Converted Admin features

All UI in this list has been rewritten with DOM controls and Tailwind. The [parity ledger](PHASE-2-PARITY.md) maps each feature to exact original/native and current/web source paths and states its testing boundary.

1. Business overview: analytics periods, daily activity, revenue/order/refund summaries, queue totals, top stores/products, refresh/error handling and cleared monthly commission/payout shortcut.
2. Store administration: status/count/search/cursor lists, application and proposed-change details, private document previews, saved payout details, review history, approval/rejection with feedback, activation/deactivation with reason, confirmation and revision checks.
3. Product moderation: status/search/store filters, pagination, submitted/live comparison, photo/size/color/stock and reservation presentation, versioned approve/reject, rejection validation and stale-review recovery.
4. Shipping: all/in-transit/attention/stock surfaces, queues/counts/dates, full/short ID and phone search, ambiguous results, pagination, order/address/location/contact/item/payment/settlement/timeline details, stock issue resolution and Support navigation.
5. Dispatch settings: Indian cutoff, weekly holidays, exceptional holidays, same-day policy, ETA and low-stock settings.
6. Labels: existing backend generation/retrieval, QR preview, escaped HTML, PDF generation/download, browser print popup and Web Share/download fallback. QR/PDF libraries load only when needed.
7. RTO: list/detail/history, recovery review/decisions, recipient routing, receipt quantities/damage/evidence, reconciliation, Seller transfer, COD completion and prepaid refund actions. **UI implemented; workflow acceptance blocked by backend HTTP 500.**
8. Support: active/history/legacy lists, filters/pages, read markers, case details, messages/photos/history; versioned stage actions for information/deadlines, approval/rejection, pickup/dropoff/failure/rescheduling, receipt, bounded inspection/restocking/dispute/closure, manual refund and exchange dispatch/delivery. Original-payment refunds remain restricted to their existing server workflow; legacy returns remain read-only.
9. Earnings/payouts: period/date/store/state filters/pages, balances/holds/release dates, order statements and settlement notes, private account details, payout history, collection records and confirmed idempotent payout records in paise.
10. Reviews: filters/pages/photos, reasoned versioned moderation and audit history.
11. Admin Settings: preserved real phone/password login and current-password change with all-session revocation.
12. Notifications, role-based navigation, browser history, refresh and mobile-accessible logout.

## Converted Seller features

1. Live Seller session/approved-active-store ownership gate; availability toggle, All/Active/History totals, recent orders/amounts, catalogue count, low-stock alerts and full payout overview.
2. Current/archived catalogue with search/pages, active status, archive/restore and conditional delete, approved preview and pending/rejected moderation feedback.
3. Three-step product add/edit: category/custom category, description/brand/SKU, INR price/MRP validation, no-size/adult/kids/footwear/custom sizes, colors, variant stock/reservations, bounded galleries, creation key, submission/inventory revisions and duplicate-operation locks.
4. Browser photo preparation/selection, upload progress, cover/color galleries and previews; successful earlier photos survive a later sequential upload failure. Timeout/502 responses never trigger unsafe fallback/replay.
5. Inventory editor with variant totals, reserved units and stale-revision recovery.
6. Orders: queue/page lists and owned deep links, viewed marker, customer/delivery/items/payment, milestones/settlement, scheduled-day/stock blocks, physical-handover confirmation, stock issue reports, return/exchange visibility and RTO receipt/inspection. **RTO downstream acceptance remains blocked.**
7. Earnings: own balances/holds/release dates/statements/private payout account/history and period/state/page controls. Seller has no Admin collection or payout-write controls.
8. Store application/status/edit/corrections: four steps, owner phone OTP proof, four bounded private documents, category/address, UPI/bank data, Seller terms, expected revision, proposed-change workflow, rejected resubmission and explicit form discard.
9. Review filtering/photos and policy-confirmed versioned Seller replies.
10. Notification inbox, owned order links, responsive navigation/logout and existing customer-mode action with native-app handoff.

## Organization and changed files

| Location                                                       | Responsibility                                                                                                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web/src/app/`                                                 | Thin Next routes, role layouts, global style, error/loading/legal pages. No business API handlers or duplicate backend.                                     |
| `web/src/features/admin/`                                      | Admin-only overview, stores, products, shipping/RTO/labels/settings, support, earnings, reviews and password settings.                                      |
| `web/src/features/seller/`                                     | Seller-only session, home, products/inventory/photos, orders/RTO, store/owner proof, earnings and reviews.                                                  |
| `web/src/features/auth/`                                       | Shared real authentication, OTP, session provider, logout and native customer handoff.                                                                      |
| `web/src/features/notifications/`                              | Existing inbox and role-specific order destinations.                                                                                                        |
| `web/src/components/`                                          | DOM controls/dialogs, shared financial/review/product presentation and responsive shell. Admin mutation controls are supplied by Admin-specific components. |
| `web/src/lib/`                                                 | API/session transport, shared types, validation/action contracts, financial formatting, URL/lifecycle hooks, image preparation and browser primitives.      |
| `web/tests/acceptance/`, `web/tests/local/`, `web/tests/unit/` | Real-backend browser scenarios, disposable local runtime/fixtures and focused regressions.                                                                  |
| `web/scripts/`, `web/docs/`                                    | Local run/setup/check commands and reviewable evidence.                                                                                                     |

The [full source list](phase-2-files.json) contains **168 TypeScript modules**: 40 route/layout/support modules in `src/app`, 38 Admin feature modules, 30 Seller feature modules and shared/auth/lib modules. The largest source file is 414 lines. Every business UI was rewritten; compatible pure contracts/models/API logic were relocated and adapted rather than unnecessarily redesigned. Admin feature modules do not import Seller feature modules, or vice versa.

The [retired-file inventory](phase-2-removed-files.json) lists **208 exact paths** removed only inside `web/`: the old `src/migrated`, `src/platform`, `src/ui` trees, obsolete RN-based tests/intercepted authority and migration scripts, an unused form fragment and customer catalogue cache invalidation module. These are web copies/adapters, not original native files. Nothing active imports them. Their replacement paths are recorded feature-by-feature in the parity ledger.

Configuration rewritten: `web/package.json`, `package-lock.json`, `next.config.mjs`, `tsconfig.json`, `playwright.config.ts`; the root stylesheet and route tree use DOM architecture. Check scripts include `web/scripts/audit-web.cjs` and `test.cjs`. README and current/historical report notices were updated. The old RN compatibility aliases, native bootstrap and global debug branches are gone. No React Native, React Native Web, Expo or React Navigation package remains in the installed dependency tree or active imports. Removing RN Web/types removed 236 installed packages. Tailwind, React Query and small browser-specific PDF/QR packages remain; no new backend framework was added.

## Existing API and authentication compatibility

The existing API root is configured by `NEXT_PUBLIC_API_URL`. This local-only project rejects non-loopback roots and embedded credentials. Calls retain the original endpoints, methods, request fields, expected revisions, submission versions, policy consent, creation/client keys, paise amounts and confirmations. The [81 call-site inventory](phase-2-api-contracts.json) is an inspection aid, not a claim of 81 distinct endpoints or that every helper is a reachable screen feature.

The Next server guard in `web/src/proxy.ts` asks the live backend `/auth/me` before protected rendering. It enforces Admin role and approved/active Seller access; authenticated store applicants receive only their application routes. APIs independently enforce their original roles/ownership. No frontend-only authority, duplicate account, password/token storage, hardcoded credentials or new authentication route was created in Phase 2.

Admin login uses existing `/auth/password/login`; Settings uses `/auth/password/change` and requires the current password. OTP request/verify, refresh and logout are retained. Cookie mutations serialize within a tab and across tabs when Web Locks is supported. Session changes cancel scoped requests and clear prior-user cache. Only interrupted reads may retry after foreground recovery; writes/uploads are not blindly replayed. The configured operator account was left unchanged. See [authentication details](ADMIN-PASSWORD.md).

Important inventory corrections: native shipping/Seller services contain ready/preparation/Admin-dispatch helper functions that the inspected native screens do not expose. They were not treated as missing business controls and were not used to invent new actions. Similarly, shared customer review report/block components are not enabled by the original Admin/Seller review workspaces. The historical Phase 1 inventory overcounted these helper capabilities.

## Current verification

The unchanged Express application runs on loopback port 4500; an authenticated fixture-control channel runs on 4501. Next runs an optimized build on 3200. An owned replica-set mongod runs on 27139, with a random `zippcart_web_phase2_*` database in a verified temporary directory. It does not read the normal backend `.env`, connect to the normal database on 27017, or change `zippcart_local`/production. Provider credentials are removed, external provider fetches are rejected and workers do not run. OTP uses the existing console-delivery mechanism captured only in memory. Accounts/passwords/control secrets are random process-only values. Browser traces/video/automatic screenshots are disabled; overview screenshots use synthetic fixtures only.

- Strict TypeScript (including unused-local/parameter checks): **passed**.
- Prettier source/test/config check: **passed**.
- Unit/source suite: **17 passed, 0 failed, 0 skipped**, including all 976 protected checksums, DOM dependency separation, lazy login, API concurrency/idempotency, native support action parity, validation, cancellation, foreground recovery and upload safety. The restricted shell initially blocked test-worker spawn with EPERM; the same command passed with permitted local child-process execution.
- Source audit: **168 modules, 81 call sites, 0 native-framework imports, largest file 414 lines**.
- Installed native-framework dependencies: **none** (`npm ls` returns an empty tree).
- Optimized normal local build: **passed** (`npm run build`, existing loopback API configuration; not a deployment).

The full browser run executed 132 cases: **123 passed / 9 failed / 0 skipped / 0 flaky**. Four failures were the larger pagination fixture containing an invalid strict-schema field; four were the real RTO backend defect; one was WebKit cookie metadata. The fixture was corrected only in web test code. A subsequent focused run passed all eight new store-review/bank-resubmission cases, while exposing a test readiness wait in pagination; that wait was corrected without weakening assertions. The final pagination run passed **4/4**, including shipping phone lookup and Admin/Seller financial page/date/state workflows. Business source did not change after the full run; test fixtures, coverage, teardown and documentation were corrected or extended.

Latest result for each of 35 scenarios in each of four projects: **135 passed / 5 failed / 0 skipped** across **140 unique cases**. This combines the full run with documented focused retests; it is not a single successful full-suite run.

| Project                            | Passed | Failed | Remaining failures                                  |
| ---------------------------------- | -----: | -----: | --------------------------------------------------- |
| Desktop Chromium                   |     34 |      1 | Real backend RTO HTTP 500                           |
| Desktop Firefox                    |     34 |      1 | Real backend RTO HTTP 500                           |
| Android Chromium emulation         |     34 |      1 | Real backend RTO HTTP 500                           |
| iPhone WebKit emulation on Windows |     33 |      2 | Real backend RTO HTTP 500; cookie metadata mismatch |

Full-run history: [phase-2-full-browser-results.json](phase-2-full-browser-results.json). Store-review run: [phase-2-focused-store-results.json](phase-2-focused-store-results.json). Final pagination retest: [phase-2-pagination-results.json](phase-2-pagination-results.json). Current per-scenario evidence: [phase-2-browser-results.json](phase-2-browser-results.json). Initial debugging run: [phase-2-initial-browser-results.json](phase-2-initial-browser-results.json), explicitly superseded. No failure is relabeled as an expected pass or skipped to make the suite green.

Windows process-tree termination initially bypassed signal cleanup and left harness folders. Fourteen directories were individually resolved under the system Temp directory and verified by the owned MongoDB test-port logs before removal. The normal local MongoDB service and existing port-3000 development service were left alone. `web/tests/local/global-teardown.mjs` now calls the authenticated test controller to finish exact database/filesystem cleanup before process termination. A further Chromium login-bundle smoke case passed with this teardown, leaving zero disposable directories/listeners. This repeated smoke is not counted as another unique feature case.

The final normal optimized site start command was also exercised on port 3100: `/login` returned HTTP 200 and anonymous `/admin/stores` and `/seller/orders` returned HTTP 307 to `/login`. This preview was then stopped. It did not log in as or modify the configured operator.

## Browser and performance observations

Desktop Chromium/Firefox and Android Chromium/iPhone WebKit viewport emulation execute the real workflows. They check mobile logout, role boundaries, URL/history, image preparation/preview, QR/PDF output and horizontal overflow. Synthetic overview screenshots were visually inspected at desktop and Android widths. The responsive sidebar can scroll vertically on short desktops; mobile navigation scrolls horizontally while logout stays separately accessible.

The current full run had no uncaught page/hydration errors in the passing scenarios. Earlier Windows WebKit document-replacement fetch warnings disappeared in that run after using Next navigation/readiness checks and disabling speculative private-route prefetch. This is evidence for the tested workflows, not proof for every browser lifecycle.

[Local cold-login measurements](phase-2-performance.json): 11 script requests, **516,088 decoded JavaScript bytes**, observed local TTFB 3-4.8 ms and load 89-122 ms across the four projects. Login imports/downloads no Admin, Seller, PDF or QR business modules. These measurements use local loopback, synthetic data and the optimized build; no slow-network/real-device/production benchmark or comparative speedup is claimed. Seller order deep links must page the existing owned-order endpoint because the backend has no owned detail endpoint; this preserves ownership but adds latency for old orders. No API was added to hide that limitation.

## Blockers and remaining acceptance

1. **Real RTO backend failure.** POST `/api/v1/rto/admin/orders/:id/actions`, action `begin_review`, returns HTTP 500 on a normal persisted RTO. `structuredClone(order.rto)` at `backend/src/rto/rto.service.js:128` turns BSON ObjectIds into plain internal objects, then saving through `backend/src/rto/rto.repository.js` fails casting `requestedBy` to ObjectId. The same clone pattern exists at service lines 264 and 308. All four browser projects reproduce it. Required backend work, outside this phase: replace those clones with BSON-safe copying that preserves ObjectIds/Dates, add a real-Mongo RTO regression and re-run receipt/inspection/restocking/COD/prepaid-refund acceptance. Backend edits were prohibited, so no workaround or fix was applied.
2. **Windows WebKit cookie discrepancy.** Actual HTTP headers pass the strict `HttpOnly; SameSite=Lax` assertion; `context.cookies()` reports SameSite=None for both cookies. JavaScript still cannot read the HttpOnly access token, and the test continues through logout/revocation, but its strict metadata assertion remains failed. The cause and actual Safari semantics need further investigation on supported Safari hardware; this is not declared benign and cookie settings were not relaxed.
3. **Physical acceptance deferred.** User chose continued emulation; Android hardware testing will be later and no iPhone is available. Actual Android Chrome and iPhone Safari, camera/gallery selection, OS sharing and physical printing remain unverified. A Windows WebKit viewport test does not certify iPhone Safari.
4. **Existing backend limits.** Expo native push has no browser subscription API. Existing inbox queries return account purchase updates, not operational Seller pushes. Web preserves inbox/polling with owned role destinations; browser push cannot be claimed without separately authorized backend work. Customer shopping remains in the native app. No new provider/API was invented.
5. **Providers and exhaustive branches.** Real SMS, external image hosting, gateway refunds/money transfer and production data were intentionally not contacted. The parity ledger explicitly distinguishes tested workflows from unit-only or unexercised branches, including exhaustive financial/filter combinations, RTO downstream states and reviewer-device behavior. Universal SPA dirty-form navigation blocking is not claimed; explicit Leave/discard and browser unload warning exist.

## Local start and decision

```powershell
cd C:\Users\User\Desktop\ZippCart\web
npm start -- --port 3100
```

Open http://127.0.0.1:3100/login with the existing loopback backend available. The optimized local build has already passed; run `npm run build` again after source changes. If the API is stopped, run `npm run dev:api` in a separate terminal. Keep the current local account/configuration; do not rerun password setup. For editing, `npm run dev -- --port 3100` is available when another development instance is not holding the same project lock.

**Native cleanup: NO-GO.** Keep every original native Admin/Seller screen until the RTO blocker, browser/security discrepancy, specifically unverified branches and physical acceptance are resolved, then obtain explicit cleanup approval. Successful UI conversion and compilation do not make this migration complete.
