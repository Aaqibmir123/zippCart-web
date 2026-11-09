import { test, expect } from "./test";
import { writeFile, mkdir } from "node:fs/promises";
import {
  reset,
  adminLogin,
  workspaceLogin,
  customerOtpLogin,
  api,
  noOverflow,
} from "./helpers";

test.beforeEach(async ({ request }) => {
  await reset(request);
});
test("Admin password, server authorization, refresh and mobile logout", async ({
  page,
  browserName,
}, info) => {
  await page.goto("/admin/stores");
  await expect(page).toHaveURL(/\/login/);
  await page
    .getByLabel("Mobile Number", { exact: true })
    .fill(process.env.WEB_TEST_ADMIN_PHONE!);
  await page
    .getByLabel("Password", { exact: true })
    .fill("wrong-isolated-password");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  const success = page.waitForResponse(
    (response) =>
      response.url().endsWith("/auth/password/login") &&
      response.status() === 200,
  );
  // Retry on the existing form, as a user does. A hard navigation here can
  // cancel WebKit's failed-login request after the alert has already rendered.
  await expect(
    page.getByRole("button", { name: "Login", exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Mobile Number", { exact: true })
    .fill(process.env.WEB_TEST_ADMIN_PHONE!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.WEB_TEST_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Business overview", exact: true }),
  ).toBeVisible();
  const headers = (await (await success).headersArray()).filter(
    (header) => header.name.toLowerCase() === "set-cookie",
  );
  expect(headers).toHaveLength(2);
  expect(
    headers.every(
      (header) =>
        /;\s*HttpOnly(?:;|$)/i.test(header.value) &&
        /;\s*SameSite=Lax(?:;|$)/i.test(header.value),
    ),
  ).toBe(true);
  const cookies = await page.context().cookies();
  const flags = cookies
    .filter((cookie) => /Token/.test(cookie.name))
    .map(({ name, httpOnly, sameSite, secure }) => ({
      name,
      httpOnly,
      sameSite,
      secure,
    }));
  // Windows WebKit lacks SameSite support. Upstream Playwright's cookie tests
  // explicitly expect None on this platform. HTTP policy remains asserted above.
  const windowsWebKit =
    browserName === "webkit" && process.platform === "win32";
  if (windowsWebKit)
    info.annotations.push({
      type: "engine-limitation",
      description:
        "Windows WebKit SameSite support: https://github.com/microsoft/playwright/blob/main/tests/library/browsercontext-cookies.spec.ts",
    });
  expect(flags).toEqual(
    expect.arrayContaining([
      {
        name: "accessToken",
        httpOnly: true,
        sameSite: windowsWebKit ? "None" : "Lax",
        secure: false,
      },
      {
        name: "refreshToken",
        httpOnly: true,
        sameSite: windowsWebKit ? "None" : "Lax",
        secure: false,
      },
    ]),
  );
  // Exercise the actual browser request too: unsafe cross-site requests must
  // fail the API Origin guard even on engines that send SameSite=Lax cookies.
  const attacker = await page.context().newPage();
  await attacker.goto("http://localhost:4501/health");
  const blocked = attacker.waitForResponse((response) =>
    response.url().endsWith("/auth/password/change"),
  );
  await attacker.evaluate(async () => {
    await fetch("http://127.0.0.1:4500/api/v1/auth/password/change", {
      method: "POST",
      mode: "no-cors",
      credentials: "include",
      headers: { "Content-Type": "text/plain" },
      body: "untrusted-origin-probe",
    });
  });
  expect((await blocked).status()).toBe(403);
  await attacker.close();
  expect((await api(page, "/auth/me")).status()).toBe(200);
  expect(
    await page.evaluate(() => document.cookie.includes("accessToken")),
  ).toBe(false);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Business overview", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: /Log out/i }).click();
  await expect(page).toHaveURL(/\/login/);
  expect((await api(page, "/auth/me")).status()).toBe(401);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("Invalid saved refresh does not leave a successful password login loading", async ({
  page,
}) => {
  await page.goto("/login");
  await page.evaluate(() =>
    localStorage.setItem(
      "zippcart.web.zippcart.auth.sessionMayExist.v1",
      "yes",
    ),
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem("zippcart.web.zippcart.auth.sessionMayExist.v1"),
    ),
  ).toBe("yes");
  await page.route("**/api/v1/auth/refresh", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        code: "REFRESH_INVALID",
        message: "Refresh token is invalid.",
      }),
    }),
  );
  const failedRefresh = page.waitForResponse(
    (response) =>
      response.url().endsWith("/auth/refresh") && response.status() === 401,
  );
  await page.reload();
  expect((await failedRefresh).status()).toBe(401);
  await page.unroute("**/api/v1/auth/refresh");
  await expect(page.getByLabel("Mobile Number", { exact: true })).toBeVisible();
  await page
    .getByLabel("Mobile Number", { exact: true })
    .fill(process.env.WEB_TEST_ADMIN_PHONE!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.WEB_TEST_ADMIN_PASSWORD!);
  const login = page.waitForResponse(
    (response) =>
      response.url().endsWith("/auth/password/login") &&
      response.status() === 200,
  );
  await page.getByRole("button", { name: "Login", exact: true }).click();
  expect((await login).status()).toBe(200);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: "Business overview", exact: true }),
  ).toBeVisible();
});

test("Login reports a browser session-cookie failure instead of staying on a loader", async ({
  page,
}) => {
  await page.goto("/login");
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        code: "AUTH_REQUIRED",
        message: "Authentication required.",
      }),
    }),
  );
  await page
    .getByLabel("Mobile Number", { exact: true })
    .fill(process.env.WEB_TEST_ADMIN_PHONE!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.WEB_TEST_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(
    page.getByText(
      "Your password was accepted, but this browser could not confirm the secure session. Open the website and API using the same hostname (both localhost or both 127.0.0.1), then try again.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Mobile Number", { exact: true })).toBeVisible();
  await expect(page.getByText("Verifying your session")).toHaveCount(0);
});

test("Seller password access and customer OTP cannot grant privileged roles", async ({
  page,
}) => {
  await workspaceLogin(page);
  await expect(
    page.getByRole("heading", { name: "Isolated Fashion", exact: true }),
  ).toBeVisible();
  expect((await api(page, "/admin/stores")).status()).toBe(403);
  const denied = await page.goto("/admin");
  expect(denied?.status()).toBe(403);
  await page.goto("/seller");
  await noOverflow(page);
  await page.getByRole("button", { name: /Log out/i }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: /OTP/i })).toHaveCount(0);
  const customer = await customerOtpLogin(
    page,
    process.env.WEB_TEST_SELLER_PHONE!,
  );
  expect(customer.user.roles).toEqual(["customer"]);
  expect((await api(page, "/seller/session")).status()).toBe(403);
  expect((await api(page, "/stores/me/details")).status()).toBe(403);
  expect((await api(page, "/stores/me/details/documents")).status()).toBe(403);
  expect(
    (
      await api(page, "/stores/me/availability", "PATCH", { isOpen: false })
    ).status(),
  ).toBe(403);
  expect((await api(page, "/admin/stores")).status()).toBe(403);
  expect(
    (await (await api(page, "/auth/refresh", "POST")).json()).user.roles,
  ).toEqual(["customer"]);
  expect(
    (
      await api(page, "/auth/password/change", "POST", {
        currentPassword: process.env.WEB_TEST_SELLER_PASSWORD,
        newPassword: "isolated-changed-password",
      })
    ).status(),
  ).toBe(403);
  await page.goto("/seller");
  await expect(page).toHaveURL(/\/login/);
});

test("Login stays focused and responsive without loading business modules", async ({
  page,
}, info) => {
  const scripts: string[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script")
      scripts.push(response.url());
  });
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByText("Admin", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Seller", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Forgot password?", exact: true }),
  ).toHaveCount(0);
  const heroHeading = page.getByRole("heading", {
    name: "Clarity for your everyday business.",
  });
  if ((page.viewportSize()?.width ?? 1280) < 1024)
    await expect(heroHeading).toBeHidden();
  else await expect(heroHeading).toBeVisible();
  await expect(page.getByLabel("Mobile Number", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `test-results/visuals/${info.project.name}-login.png`,
    fullPage: true,
  });
  const content = await Promise.all(
    scripts.map(async (url) => (await page.request.get(url)).text()),
  );
  expect(content.join("\n")).not.toMatch(
    /features[\\/]admin[\\/]|features[\\/]seller[\\/]|jspdf\.es|qrcode[\\/]lib|react-native-web/,
  );
  const navigation = await page.evaluate(() => {
    const entry = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    return {
      ttfbMs: entry.responseStart - entry.requestStart,
      domContentLoadedMs: entry.domContentLoadedEventEnd,
      loadMs: entry.loadEventEnd,
    };
  });
  await mkdir("test-results/performance", { recursive: true });
  await writeFile(
    `test-results/performance/${info.project.name}.json`,
    JSON.stringify(
      {
        scenario:
          "Synthetic local login, cold browser context, optimized Next build",
        scriptRequests: scripts.length,
        decodedScriptBytes: content.reduce(
          (sum, source) => sum + Buffer.byteLength(source),
          0,
        ),
        ...navigation,
      },
      null,
      2,
    ),
  );
  await noOverflow(page);
});

test("Shared-cookie tabs revoke old Admin access and restore the new Seller identity", async ({
  page,
}) => {
  await adminLogin(page);
  const other = await page.context().newPage();
  await other.goto("/admin");
  await expect(
    other.getByRole("heading", { name: "Business overview", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(other).toHaveURL(/\/login/);
  await workspaceLogin(page);
  await expect(other).toHaveURL(/\/seller$/);
  await expect(
    other.getByRole("heading", { name: "Business overview", exact: true }),
  ).toHaveCount(0);
  expect((await other.goto("/admin"))?.status()).toBe(403);
  await other.close();
});
