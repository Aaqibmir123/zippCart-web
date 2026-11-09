# Admin Create Seller: MongoDB code 20 investigation

2026-11-08. Scoped local fix; no deployment, push, production connection or production write.

## Confirmed running database and failure

The backend listening on port 4000 was traced to its live Node process. Its effective environment was read with credentials suppressed: `NODE_ENV=development`, `DATABASE_ENVIRONMENT=single`, database **`zippcart_local`**, loopback **127.0.0.1:27017**. Its established MongoDB sockets also pointed to that local service. This was runtime evidence, not an assumption from `.env` alone. The process environment and connection URI were not dumped into logs or reports.

MongoDB's read-only `hello` response confirmed a **standalone server**, not a replica set or mongos. A transaction containing only a read reproduced:

```text
code: 20
codeName: IllegalOperation
Transaction numbers are only allowed on a replica set member or mongos
```

`backend/src/admin/repositories/seller-invitation.repository.js` previously wrapped the invitation in `UserModel.db.transaction()`. The first session-bound user lookup failed on this standalone server, before the invitation write. The error middleware correctly suppressed private database details, so the browser saw a generic HTTP 500. The earlier acceptance fixture was a replica set; those passing tests did not exercise this local standalone topology.

This limitation is documented in [MongoDB transaction considerations](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/). MongoDB also documents [atomic single-document writes](https://www.mongodb.com/docs/manual/core/transactions/).

## Partial-record audit

Read-only checks of the confirmed local database found:

| Check | Count |
| --- | ---: |
| Users | 2 |
| Invited users | 0 |
| Stored Seller invitations | 0 |
| Stores | 0 |
| Incomplete invitation/password combinations | 0 |
| Store records without an owner account | 0 |
| Seller roles without an invitation or owned Store | 0 |

No partial Seller invitation or Store record was found. The failure occurs on the transaction's first read, so that failed path never reaches its User save. The existing two user records were left unchanged. Production records were not inspected; no conclusion about their contents is inferred from the local audit.

## Where Sellers are saved

Creation writes the existing **`users` collection** in the database to which the Express process is connected. It creates one User or conditionally reuses an eligible existing customer User. The same record contains the private password hash, first-change flag, encrypted invitation and unverified recovery email. There is no separate Seller collection.

The invitation does **not** create a Store. The Seller changes the temporary password and completes the existing documents/payout/terms onboarding. That creates a record in the existing **`stores` collection**, linked by `stores.ownerId = users._id`; Admin approval still controls dashboard access.

With the current running backend, successful creation will save only to **`zippcart_local.users`**, followed by **`zippcart_local.stores`** when onboarding is submitted. It will **not** appear in production Atlas or synchronize there. The Admin Stores list displays Store applications, so an invitation alone is not yet a Store-list row.

An approved production activation would use the existing configured production database (`zippcart_production` under the repository's production guard) and the same User/Store collections and relationships. No connection setting was switched to Atlas, no local account was copied, and no production identity was created or reset.

## Fix and preserved guarantees

An invitation modifies one User document. A multi-document transaction was unnecessary for that write. The repository now:

- Inserts a complete new User in one atomic document write, under the existing verified unique-phone index.
- Reuses an eligible customer through a conditional atomic update. It checks the identity, existing password/invitation/reviewer flags, credential version and previously read Store status. A concurrent credential change cannot be overwritten.
- Saves the hash, invitation, unverified recovery channel, first-change flag, session revocation and credential-version increment together.
- Resolves concurrent identical requests to the same identity; changed request details/passwords cannot overwrite credentials. The service retains its encrypted request fingerprint and password verification on retries.
- Continues to refuse existing Stores/workspace accounts and fails closed if the actual phone-uniqueness index is absent.

The service, HTTP API, frontend form, authorization, password hashing, email verification, customer OTP and onboarding requirements remain unchanged. No standalone fallback was added to financial/inventory transactions. Existing operations that truly need multi-document transactions still require a replica-set-capable database; this change does not certify all financial workflows on a standalone server.

No MongoDB service was stopped/reconfigured and no new persistent database was created. The existing approved disposable fixture runtime gained an optional standalone mode; its default remains a replica set. Both modes bind to loopback and delete only their owned temporary database/directory.

## Files changed

- `backend/src/admin/repositories/seller-invitation.repository.js`: atomic invitation persistence.
- `backend/tests/seller-invitation-standalone.test.js`: opt-in real standalone MongoDB HTTP regression, including full onboarding/login and concurrency.
- `web/tests/local/runtime.mjs`: standalone fixture option; default replica-set behavior retained.
- This report, its sanitized evidence JSON and a follow-up note in `web/docs/SECURE-WORKSPACE-REPORT.md`.

Original native code, production configuration, model schemas and unrelated business APIs were not changed for this fix. The existing backend watcher restarted after the repository edit, and its health endpoint responded successfully. No manual production/server deployment step was performed.

## Verification

Final results: **10 standalone regression tests passed, 8 focused browser tests passed, zero failures**. The eight browser checks are the full invitation/onboarding and concurrent-invitation scenarios in desktop Chromium, Firefox, Android Chromium emulation and iPhone WebKit emulation. [Sanitized evidence](create-seller-fix-results.json). Earlier complete workspace acceptance remains a historical baseline; it is not presented as a new full-suite run after this change.

Also passed: full backend unit regression (436 passed, zero failed; 27 opt-in checks skipped, including the standalone test run separately), web/source regression (17 passed), formatting, and source-size guard (775 files below 500 lines).

The standalone regression explicitly recreates code 20 with a read-only transaction, then tests the fixed API against that same topology. It covers Admin password login, one hashed/unverified invitation without a premature Store, idempotent retries, duplicate prevention, incorrect password, mandatory first change, old-password denial, genuine document onboarding, pending denial, Admin approval, Seller access, Admin-role denial, logout and concurrent identity reuse. The credential-race fault injection preserved the competing credential and returned HTTP 409. Removing the unique-phone index only inside the disposable fixture made creation return HTTP 503 before any new User was saved.

The four-browser rerun exercises the actual Next.js invitation form and complete first-change/onboarding/approval flow, plus concurrent invitations preserving existing customer order history. Real email delivery and physical-device acceptance remain outside these fixtures.

To run the standalone regression from `backend/`:

```powershell
$env:RUN_STANDALONE_SELLER_REGRESSION = 'true'
node --import ./scripts/unit-environment.js --test --test-reporter=spec tests/seller-invitation-standalone.test.js
Remove-Item Env:\RUN_STANDALONE_SELLER_REGRESSION
```

From `web/`, the focused browser command is:

```powershell
npm run test:browser -- --grep 'Admin invites Seller|Concurrent invitations'
```

**Native cleanup remains NO-GO.** No approval to modify production records or deploy is implied by this local fix.
