# Production website routing preparation

This file describes local code preparation only. It does not configure the DigitalOcean host or change production data.

## Website and API

- Serve Next.js at `https://zippcart.online` behind Nginx.
- Set `NEXT_PUBLIC_API_URL=/api/v1` and the server-only `ZIPPCART_API_ORIGIN=https://api.zippcart.online` from `.env.production.example`.
- Next rewrites same-host `/api/v1/*` to the existing API. Browser JavaScript never receives the API upstream value or credentials.
- Add `https://zippcart.online` to the API's exact `CLIENT_ORIGIN` allowlist and set `WORKSPACE_WEB_ORIGIN=https://zippcart.online` for recovery/verification links.
- Preserve backend-issued `Secure`, `HttpOnly` cookies. The website hostname needs its own valid HTTPS certificate and Nginx route before browser acceptance testing.

## Product images

The production example selects the existing Cloudinary provider for binary uploads. Configure its cloud name, API key and secret only in the backend's protected environment. Never put these values in Next.js `NEXT_PUBLIC_*` settings. Do not switch the live value or test uploads until that change is explicitly approved.

## Reviewer and legacy API preservation

Keep the production gateway, reviewer API, reviewer credentials and `test` database intact. The gateway already routes configured reviewer phone numbers to the isolated reviewer API. The legacy `zippcart-api` process on port 4000 is actively receiving traffic and must not be stopped or firewalled based on source inspection alone. Inventory direct clients and agree a cutover before changing its exposure; no change is included here.
