export function browserApiRoot(value: string | undefined) {
  if (!value?.trim()) return undefined;
  const normalized = value.trim().replace(/\/+$/, "");
  // Production can keep browser requests on the website origin. Next.js
  // rewrites this path to the existing API using a server-only upstream.
  if (normalized === "/api/v1") return normalized;
  if (normalized.startsWith("/"))
    throw new Error("Relative API URLs must use the same-origin /api/v1 path.");
  const url = new URL(normalized);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.endsWith("/api/v1")
  )
    throw new Error(
      "API URL must be an origin plus /api/v1, without credentials or query parameters.",
    );
  if (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    throw new Error(
      "Use HTTPS for the backend, or HTTP on loopback for local tests.",
    );
  return url.href.replace(/\/+$/, "");
}

export function serverApiRoot(
  value: string | undefined,
  upstreamOrigin: string | undefined,
) {
  const root = browserApiRoot(value);
  if (!root || !root.startsWith("/")) return root;
  if (!upstreamOrigin?.trim())
    throw new Error("ZIPPCART_API_ORIGIN is required for same-origin API routing.");
  const upstream = new URL(upstreamOrigin.trim());
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(upstream.hostname);
  if (
    upstream.username ||
    upstream.password ||
    upstream.pathname !== "/" ||
    upstream.search ||
    upstream.hash ||
    (upstream.protocol !== "https:" &&
      !(local && upstream.protocol === "http:"))
  )
    throw new Error(
      "ZIPPCART_API_ORIGIN must be an HTTPS origin (or loopback HTTP for local tests).",
    );
  return `${upstream.origin}${root}`;
}
