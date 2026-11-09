import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const { loadDom } = require("./unit/helpers/load-dom.cjs");
const root = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(root, "src");
function files(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    );
}
function graph(entries) {
  const visited = new Set();
  const packages = new Set();
  function visit(filename) {
    if (visited.has(filename)) return;
    visited.add(filename);
    const source = ts.createSourceFile(
      filename,
      fs.readFileSync(filename, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function dependency(name) {
      if (!name.startsWith(".")) {
        packages.add(name);
        return;
      }
      const base = path.resolve(path.dirname(filename), name);
      const target = [
        base,
        base + ".ts",
        base + ".tsx",
        path.join(base, "index.ts"),
      ].find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
      if (target && /\.[tj]sx?$/.test(target)) visit(target);
    }
    function walk(node) {
      if (
        ts.isImportDeclaration(node) &&
        !node.importClause?.isTypeOnly &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        dependency(node.moduleSpecifier.text);
      if (
        ts.isExportDeclaration(node) &&
        !node.isTypeOnly &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        dependency(node.moduleSpecifier.text);
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        dependency(node.arguments[0].text);
      ts.forEachChild(node, walk);
    }
    walk(source);
  }
  entries.forEach(visit);
  return { visited, packages };
}
test("original native and unrelated backend source checksums remain unchanged", () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(root, "docs/phase-2-protected-sources.json"),
      "utf8",
    ),
  );
  assert.equal(manifest.length, 976);
  const authorized = new Set(
    JSON.parse(
      fs.readFileSync(
        path.join(root, "docs/workspace-authorized-backend.json"),
        "utf8",
      ),
    ),
  );
  for (const file of authorized)
    assert.ok(file.startsWith("backend/"), "Native edits are not authorized.");
  for (const entry of manifest.filter((entry) => !authorized.has(entry.path)))
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync(path.resolve(root, "..", entry.path)))
        .digest("hex"),
      entry.sha256,
      entry.path,
    );
});
test("every active Next route uses only DOM modules and Admin/Seller remain separate", () => {
  const active = graph([
    ...files(path.join(sourceRoot, "app")).filter((file) =>
      /\.[tj]sx?$/.test(file),
    ),
    path.join(sourceRoot, "proxy.ts"),
  ]);
  assert.ok(active.visited.size > 140);
  assert.equal(
    [...active.packages].filter((name) =>
      /^(react-native|expo(?:[-/]|$)|@react-navigation)/.test(name),
    ).length,
    0,
  );
  for (const file of active.visited) {
    assert.doesNotMatch(file, /[\\/](migrated|platform|ui)[\\/]/);
    const imports = fs.readFileSync(file, "utf8");
    if (file.includes(`${path.sep}features${path.sep}admin${path.sep}`))
      assert.doesNotMatch(imports, /from\s+["'][^"']*seller\//, file);
    if (file.includes(`${path.sep}features${path.sep}seller${path.sep}`))
      assert.doesNotMatch(imports, /from\s+["'][^"']*admin\//, file);
  }
});
test("login import graph excludes role business modules and PDF/QR libraries", () => {
  const login = graph([
    path.join(sourceRoot, "app/login/page.tsx"),
    path.join(sourceRoot, "app/layout.tsx"),
  ]);
  for (const file of login.visited)
    assert.doesNotMatch(file, /[\\/]features[\\/](admin|seller)[\\/]/);
  assert.equal(login.packages.has("jspdf"), false);
  assert.equal(login.packages.has("qrcode"), false);
});
test("API configuration supports secure same-origin routing and rejects malformed roots", () => {
  const { browserApiRoot, serverApiRoot } = loadDom()("lib/api/config.ts");
  assert.equal(
    browserApiRoot("http://127.0.0.1:4000/api/v1/"),
    "http://127.0.0.1:4000/api/v1",
  );
  assert.equal(
    browserApiRoot("https://example.com/api/v1"),
    "https://example.com/api/v1",
  );
  assert.equal(browserApiRoot("/api/v1/"), "/api/v1");
  assert.equal(
    serverApiRoot("/api/v1", "https://api.zippcart.online"),
    "https://api.zippcart.online/api/v1",
  );
  assert.equal(
    serverApiRoot("https://example.com/api/v1", undefined),
    "https://example.com/api/v1",
  );
  assert.throws(() => serverApiRoot("/api/v1", undefined));
  assert.throws(() => serverApiRoot("/api/v1", "http://api.zippcart.online"));
  for (const value of [
    "http://example.com/api/v1",
    "http://user:pass@localhost/api/v1",
    "http://localhost/api/v1?token=x",
    "http://localhost/api/v2",
    "/api/v2",
    "//example.com/api/v1",
  ])
    assert.throws(() => browserApiRoot(value));
});

test("production same-origin API rewrite targets only the configured HTTPS API origin", async () => {
  const configUrl = new URL("../next.config.mjs", import.meta.url);
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalUpstream = process.env.ZIPPCART_API_ORIGIN;
  try {
    process.env.NEXT_PUBLIC_API_URL = "/api/v1";
    process.env.ZIPPCART_API_ORIGIN = "https://api.zippcart.online";
    const config = (await import(configUrl)).default;
    assert.deepEqual(await config.rewrites(), [
      {
        source: "/api/v1/:path*",
        destination: "https://api.zippcart.online/api/v1/:path*",
      },
    ]);
    process.env.ZIPPCART_API_ORIGIN = "http://api.zippcart.online";
    await assert.rejects(config.rewrites(), /HTTPS origin/);
  } finally {
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    if (originalUpstream === undefined) delete process.env.ZIPPCART_API_ORIGIN;
    else process.env.ZIPPCART_API_ORIGIN = originalUpstream;
  }
});
test("server-side workspace verification forwards the signed gateway route cookie", () => {
  const source = fs.readFileSync(path.join(sourceRoot, "proxy.ts"), "utf8");
  assert.match(source, /request\.cookies\.get\("tenantRoute"\)/);
  assert.match(source, /tenantRoute=\$\{tenantRoute\}/);
  assert.match(source, /headers:\s*\{\s*Cookie:\s*sessionCookies\s*\}/);
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", "require", compiled)(
    module,
    module.exports,
    (name) => {
      if (name === "next/server") return { NextResponse: {} };
      if (name === "./lib/api/config") return { serverApiRoot: () => "" };
      throw new Error(`Unexpected import: ${name}`);
    },
  );
  assert.equal(
    module.exports.workspaceSessionCookieHeader("access-value", "route-value"),
    "accessToken=access-value; tenantRoute=route-value",
  );
  assert.equal(
    module.exports.workspaceSessionCookieHeader("access-value"),
    "accessToken=access-value",
  );
});
test("all support stage permissions match the native action model, including original-payment restriction", () => {
  const dom = loadDom()("features/admin/support/action-model.ts");
  const nativePath = path.resolve(
    root,
    "../frontend/features/admin/returns/admin-action-model.ts",
  );
  const module = { exports: {} };
  new Function(
    "module",
    "exports",
    "require",
    ts.transpileModule(fs.readFileSync(nativePath, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
  )(module, module.exports, require);
  for (const status of [
    "under_review",
    "information_needed",
    "pickup_pending",
    "pickup_scheduled",
    "pickup_failed",
    "picked_up",
    "inspection",
    "inspection_disputed",
    "exchange_pending",
    "replacement_dispatched",
    "refund_pending",
    "refund_completed",
    "rejected",
    "cancelled",
  ]) {
    for (const refundMethod of ["upi", "bank", "cash", "original"])
      for (const preference of ["refund", "exchange"]) {
        const record = {
          status,
          refundMethod,
          preference,
          resumeStatus: "under_review",
        };
        assert.deepEqual(
          dom.actionsFor(record),
          module.exports.actionsFor(record),
          `${status}:${refundMethod}:${preference}`,
        );
      }
  }
  assert.deepEqual(
    dom.actionsFor({ status: "refund_pending", refundMethod: "original" }),
    [],
  );
  for (const quantity of ["-1", "3", "1.5", ""])
    assert.throws(() =>
      dom.inspectionItems(
        { items: [{ index: 0, quantity: 2, name: "Fixture" }] },
        { 0: quantity },
      ),
    );
  assert.throws(() => dom.isoDate("2026-02-30 12:00"));
});
test("Seller product writes preserve ownership endpoints and concurrency fields", async () => {
  const calls = [];
  const { productApi } = loadDom({
    "../../../lib/api/client": {
      apiRequest: async (...args) => calls.push(args),
    },
  })("features/seller/products/product-api.ts");
  const input = { stock: 5, variantStock: [], expectedInventoryRevision: 9 };
  await productApi.inventory("a/b", input);
  await productApi.setStatus("a/b", false);
  await productApi.archive("a/b");
  await productApi.restore("a/b");
  await productApi.remove("a/b");
  assert.deepEqual(calls[0], [
    "/seller/products/a%2Fb/inventory",
    { method: "PATCH", body: input },
  ]);
  assert.deepEqual(calls[1], [
    "/seller/products/a%2Fb/status",
    { method: "PATCH", body: { active: false } },
  ]);
  assert.deepEqual(
    calls.slice(2).map((call) => [call[0], call[1].method]),
    [
      ["/seller/products/a%2Fb/archive", "POST"],
      ["/seller/products/a%2Fb/restore", "POST"],
      ["/seller/products/a%2Fb", "DELETE"],
    ],
  );
});
test("Admin review and store activation preserve exact server revision contracts", async () => {
  const calls = [];
  const mock = {
    "../../../lib/api/client": {
      apiRequest: async (...args) => calls.push(args),
    },
  };
  const load = loadDom(mock);
  await load("features/admin/products/products-api.ts").productReviewApi.review(
    "fixture",
    12,
    "approved",
    "Reviewed",
  );
  const stores = load("features/admin/stores/stores-api.ts").adminStoreApi;
  await stores.review("fixture", "rejected", "pending", 4, "Explain rejection");
  await stores.setActive("fixture", false, 5, "Temporarily closed");
  assert.deepEqual(calls, [
    [
      "/admin/products/fixture/review",
      {
        body: {
          submissionVersion: 12,
          decision: "approved",
          reason: "Reviewed",
        },
      },
    ],
    [
      "/admin/stores/fixture/status",
      {
        method: "PATCH",
        body: {
          storeStatus: "rejected",
          expectedStatus: "pending",
          expectedRevision: 4,
          note: "Explain rejection",
        },
      },
    ],
    [
      "/admin/stores/fixture/active",
      {
        method: "PATCH",
        body: {
          isActive: false,
          expectedRevision: 5,
          note: "Temporarily closed",
        },
      },
    ],
  ]);
});
test("Shipping search forwards URL filters and cancellation; confirmed payouts retain paise and idempotency", async () => {
  const calls = [];
  const load = loadDom({
    "../../../lib/api/client": {
      apiRequest: async (...args) => calls.push(args),
    },
    "../../../lib/api/rto-api": { rtoApi: {} },
  });
  const signal = new AbortController().signal;
  await load("features/admin/shipping/shipping-api.ts").adminShippingApi.search(
    {
      mode: "reference",
      query: "A1B2C3D4",
      page: 2,
      queue: "cancelled",
      from: "2026-10-01",
      to: "2026-10-31",
      signal,
    },
  );
  const url = new URL(calls[0][0], "https://example.test");
  assert.equal(url.pathname, "/admin/shipping/orders/search");
  assert.equal(url.searchParams.get("from"), "2026-10-01");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(calls[0][1].signal, signal);
  const body = {
    amountPaise: 12501,
    reference: "fixture-transfer",
    method: "upi",
    clientKey: "fixture-client-key",
    transferConfirmed: true,
  };
  await load("features/admin/earnings/earnings-api.ts").earningsApi.payout(
    "fixture-store",
    body,
  );
  assert.deepEqual(calls[1], [
    "/admin/earnings/stores/fixture-store/payouts",
    { body },
  ]);
});
