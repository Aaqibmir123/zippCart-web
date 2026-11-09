import { randomBytes, randomInt } from "node:crypto";
import type { Page } from "@playwright/test";
import { test, expect } from "./test";
import {
  adminLogin,
  api,
  control,
  noOverflow,
  reset,
  workspaceLogin,
} from "./helpers";

const secret = () => randomBytes(24).toString("base64url");
async function autofill(page: Page, label: string, value: string) {
  // Password-manager DOM assignment without React onChange. Assertions return
  // booleans only so a failure never prints the credential.
  await page.getByLabel(label, { exact: true }).evaluate((input, text) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, text);
  }, value);
}
async function visibleValue(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true });
  await expect(input).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Show " + label.toLowerCase(), exact: true })
    .click();
  await expect(input).toHaveAttribute("type", "text");
  expect(
    await input.evaluate(
      (element, text) => (element as HTMLInputElement).value === text,
      value,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Hide " + label.toLowerCase(), exact: true })
    .click();
  await expect(input).toHaveAttribute("type", "password");
  expect(
    await input.evaluate(
      (element, text) => (element as HTMLInputElement).value === text,
      value,
    ),
  ).toBe(true);
}

test("Seller is listed before onboarding and password-manager values survive change, logout and re-login", async ({
  page,
  browser,
}) => {
  await reset(page.request);
  await adminLogin(page);
  await page.getByRole("link", { name: "Sellers", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sellers", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Create Seller", exact: true }).click();
  const initial = secret(),
    replacement = secret(),
    stale = secret();
  const phone = "9" + String(randomInt(100000000, 1000000000));
  for (const [label, value] of Object.entries({
    "Seller name": "Autofill Seller",
    "Phone number": phone,
    Email: "autofill-seller@example.test",
    "Store name": "Autofill Boutique",
    "Store address": "27 Isolated Market Road, Kupwara",
    "Initial password": initial,
  }))
    await page.getByLabel(label, { exact: true }).fill(value);
  await visibleValue(page, "Initial password", initial);
  await page
    .getByRole("button", { name: "Create Seller", exact: true })
    .click();
  await page
    .getByRole("link", { name: "View Seller account", exact: true })
    .click();
  const id = page.url().split("/").at(-1)!;
  await expect(
    page.getByRole("heading", { name: "Autofill Seller", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Not started", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send password reset link", exact: true }),
  ).toBeDisabled();
  const detail = await (await api(page, "/admin/sellers/" + id)).json();
  const serialized = JSON.stringify(detail);
  expect(
    /passwordHash|adminPasswordHash|authSessions|resetHash|verificationHash|privateData|payout|aadhaar/i.test(
      serialized,
    ),
  ).toBe(false);
  await page.getByRole("link", { name: "All Sellers", exact: true }).click();
  await page
    .getByLabel("Search sellers", { exact: true })
    .fill("Autofill Boutique");
  await page
    .getByRole("button", { name: "Apply seller search", exact: true })
    .click();
  await page
    .getByLabel("Onboarding status", { exact: true })
    .selectOption("not_started");
  await expect(
    page.getByRole("heading", { name: "Autofill Seller", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  const context = await browser.newContext(),
    seller = await context.newPage();
  await workspaceLogin(seller, phone, initial);
  await seller.getByLabel("Current password", { exact: true }).fill(initial);
  await seller.getByLabel("New password", { exact: true }).fill(stale);
  await seller.getByLabel("Confirm new password", { exact: true }).fill(stale);
  await autofill(seller, "New password", replacement);
  await autofill(seller, "Confirm new password", replacement);
  await visibleValue(seller, "New password", replacement);
  await visibleValue(seller, "Confirm new password", replacement);
  await seller
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(seller).toHaveURL(/\/login\?passwordChanged=1$/);
  await seller.getByLabel("Mobile Number", { exact: true }).fill(phone);
  await seller.getByLabel("Password", { exact: true }).fill(stale);
  await autofill(seller, "Password", replacement);
  await visibleValue(seller, "Password", replacement);
  await seller.getByRole("button", { name: "Login", exact: true }).click();
  await expect(seller).toHaveURL(/\/seller\/application$/);
  expect((await api(seller, "/admin/sellers")).status()).toBe(403);
  await seller.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(seller).toHaveURL(/\/login$/);
  await workspaceLogin(seller, phone, replacement);
  await expect(seller).toHaveURL(/\/seller\/application$/);
  expect((await api(seller, "/seller/products")).status()).toBe(403);
  await page
    .getByLabel("Account status", { exact: true })
    .selectOption("ready");
  await expect(
    page.getByRole("heading", { name: "Autofill Seller", exact: true }),
  ).toBeVisible();
  await noOverflow(seller);
  await context.close();
});

test("Admin Seller reset uses only a verified channel and exposes no recovery secret", async ({
  page,
  browser,
}) => {
  const data = await reset(page.request);
  const context = await browser.newContext(),
    seller = await context.newPage();
  await workspaceLogin(seller);
  await seller.goto("/account/settings");
  await seller
    .getByLabel("Recovery email", { exact: true })
    .fill("verified-seller@example.test");
  await seller
    .getByLabel("Current password for email verification", { exact: true })
    .fill(process.env.WEB_TEST_SELLER_PASSWORD!);
  await visibleValue(
    seller,
    "Current password for email verification",
    process.env.WEB_TEST_SELLER_PASSWORD!,
  );
  await seller
    .getByRole("button", {
      name: "Save email & send verification",
      exact: true,
    })
    .click();
  await expect(seller.getByText(/Verification email accepted/)).toBeVisible();
  const verification = (await control(page.request, "/email")).message.token;
  await seller.goto("/verify-email#token=" + verification);
  await seller
    .getByRole("button", { name: "Confirm recovery email", exact: true })
    .click();
  await expect(seller.getByText(/Recovery email verified/)).toBeVisible();
  await adminLogin(page);
  const list = await (
    await api(page, "/admin/sellers?q=" + process.env.WEB_TEST_SELLER_PHONE)
  ).json();
  expect(list.sellers).toHaveLength(1);
  const id = list.sellers[0].id;
  await page.goto("/admin/sellers/" + id);
  await page
    .getByRole("button", { name: "Send password reset link", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Send password reset link", exact: true })
    .click();
  await expect(page.getByText(/A reset link was requested/)).toBeVisible();
  const message = (await control(page.request, "/email")).message;
  expect(message.purpose).toBe("reset");
  await seller.goto("/reset-password#token=" + message.token);
  const next = secret();
  await seller.getByLabel("New password", { exact: true }).fill(next);
  await seller.getByLabel("Confirm new password", { exact: true }).fill(next);
  await visibleValue(seller, "New password", next);
  await visibleValue(seller, "Confirm new password", next);
  await seller
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await expect(
    seller.getByText("Password reset. Sign in with your new password.", {
      exact: true,
    }),
  ).toBeVisible();
  await workspaceLogin(seller, process.env.WEB_TEST_SELLER_PHONE!, next);
  await expect(seller).toHaveURL(/\/seller$/);
  expect(
    (
      await api(seller, "/admin/sellers/" + id + "/password-reset", "POST", {})
    ).status(),
  ).toBe(403);
  expect(
    (await api(seller, "/seller/products/" + data.foreignProductId)).status(),
  ).toBe(404);
  await context.close();
});
