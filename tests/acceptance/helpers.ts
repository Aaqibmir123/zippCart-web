import { expect, type Page, type APIRequestContext } from "@playwright/test";

export type Fixture = Record<string, string>;
export async function control(
  request: APIRequestContext,
  path: string,
  method = "GET",
) {
  const response = await request.fetch(`http://127.0.0.1:4501${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.WEB_TEST_CONTROL_TOKEN}` },
  });
  expect(response.status(), "Isolated test control request").toBe(200);
  return response.json();
}
export async function reset(request: APIRequestContext): Promise<Fixture> {
  return control(request, "/reset", "POST");
}
export async function adminLogin(page: Page) {
  await page.goto("/login");
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
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /^(Loading|Checking|Opening|Returning)/i }),
  ).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}
export async function workspaceLogin(
  page: Page,
  phone = process.env.WEB_TEST_SELLER_PHONE!,
  secret?: string,
) {
  const password =
    secret ??
    (phone === process.env.WEB_TEST_ADMIN_PHONE
      ? process.env.WEB_TEST_ADMIN_PASSWORD!
      : phone === process.env.WEB_TEST_APPLICANT_PHONE
        ? process.env.WEB_TEST_APPLICANT_PASSWORD!
        : process.env.WEB_TEST_SELLER_PASSWORD!);
  await page.goto("/login");
  await page.getByLabel("Mobile Number", { exact: true }).fill(phone);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(
    /\/(seller|admin)(\/application)?$|\/account\/password$/,
  );
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /^(Loading|Checking|Opening|Returning)/i }),
  ).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}
export async function customerOtpLogin(page: Page, phone: string) {
  expect(
    (await api(page, "/auth/otp/request", "POST", { phone })).status(),
  ).toBe(202);
  const { code } = await control(page.request, "/otp");
  const result = await api(page, "/auth/otp/verify", "POST", { phone, code });
  expect(result.status()).toBe(200);
  return result.json();
}
export async function api(
  page: Page,
  path: string,
  method = "GET",
  data?: unknown,
) {
  // Keep the exact hostname used by the browser API root. Cookies are
  // host-only, so 127.0.0.1 and localhost do not share the workspace session.
  return page.request.fetch(`http://localhost:4500/api/v1${path}`, {
    method,
    data,
    headers: { Origin: "http://localhost:3200" },
  });
}
export async function confirm(page: Page, title: string) {
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button").last().click();
  await expect(dialog).not.toBeVisible();
}
export async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
