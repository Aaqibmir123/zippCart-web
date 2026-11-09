function apiRewrite() {
  const browserApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (browserApiUrl !== "/api/v1") return [];

  const configuredOrigin = process.env.ZIPPCART_API_ORIGIN?.trim();
  if (!configuredOrigin)
    throw new Error(
      "ZIPPCART_API_ORIGIN is required when NEXT_PUBLIC_API_URL=/api/v1.",
    );
  const origin = new URL(configuredOrigin);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    (origin.protocol !== "https:" &&
      !(local && origin.protocol === "http:"))
  )
    throw new Error(
      "ZIPPCART_API_ORIGIN must be an HTTPS origin (or loopback HTTP for local tests).",
    );
  return [
    {
      source: "/api/v1/:path*",
      destination: `${origin.origin}/api/v1/:path*`,
    },
  ];
}

export default {
  distDir:
    process.env.ZIPPCART_WEB_TEST === "true"
      ? ".next-phase2-test"
      : ".next",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
  async rewrites() {
    return apiRewrite();
  },
};
