# Admin password authentication - local setup

Historical Admin-only implementation notes. Both roles now use password authentication, with invitations and independently verified email recovery. See [the current secure-workspace report](SECURE-WORKSPACE-REPORT.md) for current paths, setup and acceptance. OTP statements and test totals below describe the earlier phase.

Updated 2026-11-08 for the Phase 2 React DOM implementation. Full migration acceptance and blockers are in [PHASE-2-REPORT.md](PHASE-2-REPORT.md). This capability was authorized and implemented before Phase 2; no backend authentication file was changed during the DOM conversion.

Admin phone/password login uses the existing backend User identity, configured `ADMIN_PHONE`, server-derived Admin role, signed JWT/HttpOnly cookie sessions and revocation checks. Existing OTP remains available. The optional private `adminPasswordHash` is excluded from ordinary queries and public account responses.

The configured loopback `zippcart_local` database originally had no matching Admin account. The user authorized creating the missing local identity. Earlier setup created one account through the existing unique-phone upsert and role resolution. The requested temporary password was entered through a masked local prompt; only its salted hash was stored. Neither the configured phone nor password is hardcoded here or in web source. Phase 2 tests do not reset or change that operator identity.

## Earlier authorized backend implementation

Six existing authentication-related source files contain that earlier change:

1. `backend/src/shared/models/user.model.js`: optional private password hash on the existing User.
2. `backend/src/shared/repositories/user.repository.js`: private credential lookup, atomic compare-and-set password update, session clearing and authVersion increment.
3. `backend/src/shared/validators/auth.validator.js`: strict bounded login/change inputs; replacement passwords require 12-128 characters and must differ from the current password.
4. `backend/src/shared/services/auth.service.js`: salted scrypt hashing, timing-safe verification, Admin eligibility, throttling, existing session creation and current-password verification.
5. `backend/src/shared/controllers/auth.controller.js`: password handlers using existing HttpOnly cookie helpers, with no credential/token response fields.
6. `backend/src/shared/routes/auth.routes.js`: POST `/api/v1/auth/password/login` and `/api/v1/auth/password/change`, origin protection and IP/account limits; changes require authenticated Admin and reject reviewer sessions.

Scrypt uses random 16-byte salts, 64-byte keys and fixed N=32768, r=8, p=3 with bounded memory. Unknown or unauthorized accounts perform a dummy derivation and receive the same generic credential error. The Mongo-backed limit is five attempts per account and twenty per IP per fifteen minutes for login; changes allow five per account and ten per IP. Password changes atomically replace the hash, increment authVersion and clear sessions; all prior access/refresh tokens then fail server checks. The browser returns to login after a successful change.

## Local start

From `C:\Users\User\Desktop\ZippCart\web`:

```powershell
# Only if the existing local API is not already running:
npm run dev:api
# In another terminal:
npm run dev -- --port 3100
```

Open http://127.0.0.1:3100/login. Use the already configured local Admin phone and temporary password. Admin Settings offers Change Password and requires the current password. No provisioning command is needed to start the website.

Keep `.env.local` configured for the loopback API and use an origin already allowed by that local backend. The normal development API command refuses remote/non-local database settings and starts no background workers. Do not modify production configuration to run this project.

## Future local-only provisioning

Already performed in this workspace. For a different local database that has not yet been provisioned:

```powershell
npm run setup:admin -- --create-if-missing
```

The command reads existing local backend configuration, prompts twice with masked input, requires `zippcart_local`, refuses production/remote/reviewer databases, preserves phone uniqueness and refuses to overwrite an already configured password. Without the flag, an existing account is required. Never provide passwords in arguments, environment files, URLs, logs or Git. Subsequent changes belong in Admin Settings.

## Current web implementation and evidence

- Login/OTP: `web/src/features/auth/login-screen.tsx`, `otp-code-input.tsx`, `auth-provider.tsx`.
- Settings: `web/src/features/admin/settings/password-settings.tsx`, `web/src/app/admin/settings/page.tsx`.
- Protected routes/session/logout: `web/src/proxy.ts`, `web/src/features/auth/session-boundary.tsx`, `logout-button.tsx`, `web/src/lib/api/client.ts`, `auth-api.ts`, `web/src/lib/auth/browser-lock.ts`.
- Local scripts: `web/scripts/setup-admin-password.mjs`, `start-local-backend.mjs`, `test-admin-auth.mjs`.
- Real-backend browser evidence: `web/tests/acceptance/auth.spec.ts`, `workflows.spec.ts`; harness `web/tests/local/server.mjs`, `runtime.mjs`, `seed.mjs`.

The current suite exercises wrong/correct password, server authorization, session refresh, HttpOnly response headers, mobile logout, cross-tab identity changes, current-password change, all-session revocation, new-password login, throttling and existing Admin/Seller OTP against the unchanged backend and a random disposable MongoDB database. Credentials are generated in memory. The real operator account is untouched.

Windows WebKit reports SameSite=None in `context.cookies()` although the actual Set-Cookie headers specify HttpOnly; SameSite=Lax. That assertion remains failed; cookie policy was not weakened. Actual iPhone Safari remains unverified. See current per-engine results in [phase-2-browser-results.json](phase-2-browser-results.json).

Earlier password-phase results (including the operator smoke test and a 40-case intercepted browser suite) are historical. The intercepted authority and obsolete React Native Web test suite have been removed; they are not current acceptance proof. Phase 2 uses the real API/session implementation. No deployment, push, production-data change or native cleanup occurred. Native cleanup remains **NO-GO**.
