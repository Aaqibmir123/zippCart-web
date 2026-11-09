# ZippCart web

Next.js App Router, TypeScript, React DOM and Tailwind. Admin and Seller business code is separated. There are no React Native Web, Expo or React Navigation dependencies.

The current implementation adds password-only workspaces, Admin Seller invitations, mandatory first password change and independently verified email recovery. See [the current report](docs/SECURE-WORKSPACE-REPORT.md) for exact paths, security behavior, tests and production setup. The [feature verification ledger](docs/WORKSPACE-FEATURE-VERIFICATION.md) and [change inventory](docs/workspace-files.json) provide exact source/test paths. Phase 2 reports are historical baselines.

**Native cleanup: NO-GO.** No deployment, push, production record change or native cleanup is included. Passing local fixtures does not establish production readiness or physical-device/email delivery acceptance.

## Local start

```powershell
cd C:\Users\User\Desktop\ZippCart\web
npm ci
# Preserve an existing .env.local. Only if it is missing:
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run build
npm start -- --port 3100
```

Open http://127.0.0.1:3100/login. Use the existing configured backend and account. If the local API is stopped, run `npm run dev:api` in another terminal. That command remains loopback/local-only, refuses Atlas and does not start workers or provision credentials. For editing, `npm run dev -- --port 3100` is available when no other dev instance holds the project lock.

`NEXT_PUBLIC_API_URL` is the public API root ending in `/api/v1`; HTTP is allowed only for loopback development, remote roots require HTTPS. Use an exact origin already allowed by the backend. Never put MongoDB/provider/JWT/encryption secrets in NEXT_PUBLIC variables. No command automatically replaces local configuration with Atlas or changes production CORS.

For the planned production host `https://zippcart.online`, configure the non-secret values in [`.env.production.example`](.env.production.example): `NEXT_PUBLIC_API_URL=/api/v1` keeps browser traffic same-origin and `ZIPPCART_API_ORIGIN=https://api.zippcart.online` is used only by the Next.js server rewrite and route guard. The backend must explicitly allow `https://zippcart.online` in `CLIENT_ORIGIN` and use it for `WORKSPACE_WEB_ORIGIN`. The example values do not configure the live server; the website still requires an approved deployment, HTTPS certificate and Nginx route.

Do not rerun password provisioning to start the website. The earlier local Admin setup is preserved. The local setup command refuses existing legacy and generic hashes. The separate server-only production initial-provisioning tool is dry-run by default, operates only on existing identities, and requires explicit approval to apply; see the report before using it.

## Login, invitations and recovery

- Admin and Seller sign in with phone + password. Customer OTP remains in the Android app. OTP/legacy sessions cannot gain privileged roles through refresh or account-mode switching.
- Admin creates a Seller invitation from Stores. Email begins unverified; the initial password is never emailed. The Seller must replace it, then complete the existing document/payout/consent onboarding. Approval is still required before dashboard access.
- Both roles have Account Settings and current-password changes. Recovery email enrollment/replacement requires the current password and a single-use verification link. Existing customer profile email is not a verified recovery channel.
- Forgot Password uses only independently verified email. Tokens are hashed, expiring, single-use and never returned by application APIs. Production delivery is disabled until backend provider/sender/origin configuration is supplied. Missing configuration is visible; no delivery or verification is simulated.
- Cookies remain HttpOnly and server-authorized. Role/ownership checks, account-scoped cancellation/cache clearing, refresh/logout and write/upload retry boundaries remain enforced.

Customer shopping stays native. Existing inbox/polling remains; browser push has no supported backend subscription API. Physical image pickers, OS share/print and actual Safari acceptance remain separate.

## Organization

- `src/app`: thin Next routes/layouts and global Tailwind styles; no duplicate backend API handlers.
- `src/features/admin`: overview, stores, Seller invitations, moderation, shipping/RTO/labels/settings, support, earnings and reviews.
- `src/features/seller`: session ownership, home, catalogue/inventory/photos, orders/RTO, applications/store details, earnings and reviews.
- `src/features/auth`: shared password/session/recovery UI and API integration.
- `src/features/notifications`: shared inbox with owned, role-specific destinations.
- `src/components`, `src/lib`: reusable DOM presentation, contracts, transport, session primitives, formatting and media preparation.
- `tests/acceptance`, `tests/local`, `tests/unit`: browser workflows, disposable runtime and focused/source regressions.
- `docs`: current report, exact change inventories, protected native checksums and sanitized test evidence.

## Checks

```powershell
npm run typecheck
npm run format:check
npm test
npm run audit:web
npm run test:browser
```

Browser tests build the optimized site on 127.0.0.1:3200, run the real backend on 4500 and use an authenticated fixture controller on 4501. An owned local replica set binds to 27139 with a random temporary database. The user approved this disposable test isolation. It never reads the normal backend `.env`, connects to Atlas or changes `zippcart_local`. Provider credentials are stripped and external fetches blocked. Email/OTP test delivery is captured only in memory; real verification/reset/session code is exercised. Credentials are randomly generated in memory, with traces/videos/credential screenshots disabled.

Install browser engines with `npx playwright install chromium firefox webkit`. `WEB_TEST_MONGOD` can override the installed mongod path. Keep test ports free. Authenticated teardown deletes only its verified owned database/temp directory; build-failure cleanup is also supported. Desktop Chromium/Firefox, Android Chromium and iPhone WebKit emulation are distinct projects. Emulation does not certify physical Android Chrome or iPhone Safari.
