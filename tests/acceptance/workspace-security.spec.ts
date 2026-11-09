import { randomBytes, randomUUID, randomInt } from "node:crypto";
import { test, expect } from "./test";
import {
  adminLogin,
  api,
  confirm,
  control,
  customerOtpLogin,
  noOverflow,
  reset,
  workspaceLogin,
} from "./helpers";
import type { Page } from "@playwright/test";

const secret = () => randomBytes(24).toString("base64url");
const phone = () => `9${randomInt(100000000, 1000000000)}`;
async function changePassword(page: Page, current: string, next: string) {
  await page.getByLabel("Current password", { exact: true }).fill(current);
  await page.getByLabel("New password", { exact: true }).fill(next);
  await page.getByLabel("Confirm new password", { exact: true }).fill(next);
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?passwordChanged=1$/);
}
async function verifyLatestEmail(page: Page) {
  const { message } = await control(page.request, "/email");
  expect(message.purpose).toBe("verify");
  await page.goto(`/verify-email#token=${message.token}`);
  await expect(page).toHaveURL(/\/verify-email$/);
  await page
    .getByRole("button", { name: "Confirm recovery email", exact: true })
    .click();
  await expect(
    page.getByText(
      "Recovery email verified. You can now use it for password recovery.",
      { exact: true },
    ),
  ).toBeVisible();
  return message.token as string;
}

test("Admin invites Seller, mandatory first change and real onboarding gate all dashboard access", async ({
  page,
  browser,
}) => {
  const data = await reset(page.request);
  await adminLogin(page);
  await page.goto("/admin/stores");
  await page.getByRole("link", { name: "Create Seller", exact: true }).click();
  const initial = secret();
  const next = secret();
  const number = phone();
  await page
    .getByLabel("Seller name", { exact: true })
    .fill("Invited Local Seller");
  await page.getByLabel("Phone number", { exact: true }).fill(number);
  await page
    .getByLabel("Email", { exact: true })
    .fill("invited-seller@example.test");
  await page
    .getByLabel("Store name", { exact: true })
    .fill("Invited Fashion Store");
  await page
    .getByLabel("Store address", { exact: true })
    .fill("17 Isolated Market Road, Kupwara");
  await page.getByLabel("Initial password", { exact: true }).fill(initial);
  await page
    .getByRole("button", { name: "Create Seller", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seller invited", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  const sellerContext = await browser.newContext();
  const seller = await sellerContext.newPage();
  await workspaceLogin(seller, number, initial);
  await expect(seller).toHaveURL(/\/account\/password$/);
  expect((await api(seller, "/seller/products")).status()).toBe(403);
  expect((await api(seller, "/stores/me")).status()).toBe(403);
  await changePassword(seller, initial, next);
  expect(
    (
      await api(seller, "/auth/password/login", "POST", {
        phone: number,
        password: initial,
      })
    ).status(),
  ).toBe(401);
  await workspaceLogin(seller, number, next);
  await expect(seller).toHaveURL(/\/seller\/application$/);
  await expect(seller.getByLabel("Store name", { exact: true })).toHaveValue(
    "Invited Fashion Store",
  );
  await expect(
    seller.getByLabel("Seller login number", { exact: true }),
  ).toBeDisabled();
  expect((await api(seller, "/seller/session")).status()).toBe(403);
  await seller.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(seller.getByLabel("Full address", { exact: true })).toHaveValue(
    "17 Isolated Market Road, Kupwara",
  );
  await seller
    .getByLabel("Area / Locality", { exact: true })
    .fill("Isolated Market");
  await seller.getByLabel("Pincode", { exact: true }).fill("193222");
  await seller.getByRole("button", { name: "Continue", exact: true }).click();
  for (const label of [
    "Store front photo",
    "Aadhaar card",
    "PAN card",
    "Shop license",
  ]) {
    const chooser = seller.waitForEvent("filechooser");
    await seller.getByText(`Add ${label}`, { exact: true }).click();
    await (
      await chooser
    ).setFiles({
      name: "document.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(data.photo.split(",")[1], "base64"),
    });
    await expect(
      seller.getByRole("img", { name: `${label} preview`, exact: true }),
    ).toHaveJSProperty("naturalWidth", 32);
  }
  await seller.getByRole("button", { name: "Continue", exact: true }).click();
  await seller.getByLabel("UPI ID", { exact: true }).fill("isolated@bank");
  await seller
    .getByLabel("I have read and accept the Seller Terms.", { exact: true })
    .check();
  await seller
    .getByRole("button", { name: "Submit registration", exact: true })
    .click();
  await expect(
    seller.getByText("Pending review", { exact: true }),
  ).toBeVisible();
  const registered = await (await api(seller, "/stores/me")).json();
  expect((await api(seller, "/seller/session")).status()).toBe(403);
  await page.goto(`/admin/stores/${registered.store.id}`);
  await page
    .getByRole("button", { name: "Approve store", exact: true })
    .click();
  await confirm(page, "Approve this store?");
  await expect(
    page.getByText("Store approved.", { exact: true }),
  ).toBeVisible();
  await seller.goto("/seller");
  await expect(
    seller.getByRole("heading", { name: "Invited Fashion Store", exact: true }),
  ).toBeVisible();
  expect(
    (await api(seller, `/seller/products/${data.foreignProductId}`)).status(),
  ).toBe(404);
  expect((await api(seller, "/admin/stores")).status()).toBe(403);
  await noOverflow(seller);
  await sellerContext.close();
});

for (const role of ["ADMIN", "SELLER"] as const) {
  test(`${role} verified email recovery rejects unverified/reused links and revokes all old sessions`, async ({
    page,
    browser,
  }) => {
    await reset(page.request);
    const number = process.env[`WEB_TEST_${role}_PHONE`]!;
    const current = process.env[`WEB_TEST_${role}_PASSWORD`]!;
    const next = secret();
    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    if (role === "ADMIN") {
      await adminLogin(page);
      await adminLogin(other);
    } else {
      await workspaceLogin(page);
      await workspaceLogin(other);
    }
    await page.goto("/account/settings");
    await page
      .getByLabel("Recovery email", { exact: true })
      .fill(`${role.toLowerCase()}@example.test`);
    await page
      .getByLabel("Current password for email verification", { exact: true })
      .fill(current);
    await page
      .getByRole("button", {
        name: "Save email & send verification",
        exact: true,
      })
      .click();
    await expect(
      page.getByText(/Verification email accepted by the provider/),
    ).toBeVisible();
    const before = await control(page.request, "/email");
    expect(
      (
        await api(page, "/auth/password/recovery/request", "POST", {
          phone: number,
        })
      ).status(),
    ).toBe(202);
    expect((await control(page.request, "/email")).count).toBe(before.count);
    const token = await verifyLatestEmail(page);
    expect(
      (
        await api(page, "/auth/password/recovery/verify", "POST", { token })
      ).status(),
    ).toBe(400);
    await page.goto("/account/settings");
    const updatedEmail = `${role.toLowerCase()}-updated@example.test`;
    await page.getByLabel("Recovery email", { exact: true }).fill(updatedEmail);
    await page
      .getByLabel("Current password for email verification", { exact: true })
      .fill("incorrect-isolated-password");
    await page
      .getByRole("button", {
        name: "Save email & send verification",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("The current password is incorrect.", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Current password for email verification", { exact: true })
      .fill(current);
    await page
      .getByRole("button", {
        name: "Save email & send verification",
        exact: true,
      })
      .click();
    await expect(
      page.getByText(/Verification email accepted by the provider/),
    ).toBeVisible();
    const pending = await (await api(page, "/auth/password/settings")).json();
    expect(pending.email).toBe(`${role.toLowerCase()}@example.test`);
    expect(pending.verified).toBe(true);
    expect(pending.pendingEmail).toBe(updatedEmail);
    await verifyLatestEmail(page);
    expect(
      (await (await api(page, "/auth/password/settings")).json()).email,
    ).toBe(updatedEmail);
    expect(
      (
        await api(page, "/auth/password/recovery/email", "POST", {
          email: `${role.toLowerCase()}-pending@example.test`,
          currentPassword: current,
        })
      ).status(),
    ).toBe(202);
    const pendingReplacement = (await control(page.request, "/email")).message
      .token;
    await page.goto("/forgot-password");
    await page.getByLabel("Mobile Number", { exact: true }).fill(number);
    await page
      .getByRole("button", { name: "Send recovery link", exact: true })
      .click();
    await expect(
      page.getByText(/If this account has a verified recovery email/),
    ).toBeVisible();
    const resetEmail = (await control(page.request, "/email")).message;
    expect(resetEmail.purpose).toBe("reset");
    await page.goto(`/reset-password#token=${resetEmail.token}`);
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.getByLabel("New password", { exact: true }).fill(next);
    await page.getByLabel("Confirm new password", { exact: true }).fill(next);
    await page
      .getByRole("button", { name: "Reset password", exact: true })
      .click();
    await expect(
      page.getByText("Password reset. Sign in with your new password.", {
        exact: true,
      }),
    ).toBeVisible();
    expect((await api(other, "/auth/me")).status()).toBe(401);
    expect(
      (
        await api(page, "/auth/password/recovery/verify", "POST", {
          token: pendingReplacement,
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await api(page, "/auth/password/recovery/reset", "POST", {
          token: resetEmail.token,
          newPassword: secret(),
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await api(page, "/auth/password/login", "POST", {
          phone: number,
          password: current,
        })
      ).status(),
    ).toBe(401);
    await workspaceLogin(page, number, next);
    expect((await api(page, "/auth/me")).status()).toBe(200);
    expect(
      (
        await api(page, "/auth/password/recovery/request", "POST", {
          phone: number,
        })
      ).status(),
    ).toBe(202);
    const concurrentToken = (await control(page.request, "/email")).message
      .token;
    const concurrentPassword = secret();
    const outcomes = await Promise.all([
      api(page, "/auth/password/recovery/reset", "POST", {
        token: concurrentToken,
        newPassword: concurrentPassword,
      }),
      api(page, "/auth/password/recovery/reset", "POST", {
        token: concurrentToken,
        newPassword: concurrentPassword,
      }),
    ]);
    expect(outcomes.map((value) => value.status()).sort()).toEqual([204, 400]);
    await workspaceLogin(page, number, concurrentPassword);
    await noOverflow(page);
    await otherContext.close();
  });
}

test("Concurrent invitations are idempotent, reuse customer identity and cannot overwrite existing credentials", async ({
  page,
  browser,
}) => {
  const data = await reset(page.request);
  await adminLogin(page);
  const initial = secret();
  const input = {
    sellerName: "Existing Customer Seller",
    phone: data.buyerPhone,
    email: "existing-buyer@example.test",
    storeName: "Existing Identity Shop",
    address: "29 Isolated Road, Kupwara",
    category: "Fashion",
    password: initial,
    clientKey: randomUUID(),
  };
  const responses = await Promise.all([
    api(page, "/admin/sellers", "POST", input),
    api(page, "/admin/sellers", "POST", input),
  ]);
  expect(responses.map((response) => response.status()).sort()).toEqual([
    200, 201,
  ]);
  for (const response of responses)
    expect((await response.json()).sellerId).toBe(data.buyerId);
  expect((await control(page.request, "/email")).count).toBe(1);
  expect(
    (
      await api(page, "/admin/sellers", "POST", {
        ...input,
        password: secret(),
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await api(page, "/admin/sellers", "POST", {
        ...input,
        clientKey: randomUUID(),
      })
    ).status(),
  ).toBe(409);
  const context = await browser.newContext();
  const customer = await context.newPage();
  const otp = await customerOtpLogin(customer, data.buyerPhone);
  expect(otp.user.id).toBe(data.buyerId);
  expect(otp.user.roles).toEqual(["customer"]);
  const orders = await api(customer, "/orders");
  expect(orders.status()).toBe(200);
  expect(JSON.stringify(await orders.json()).includes(data.orderId)).toBe(true);
  expect((await api(customer, "/admin/sellers", "POST", input)).status()).toBe(
    403,
  );
  const login = await api(customer, "/auth/password/login", "POST", {
    phone: data.buyerPhone,
    password: initial,
  });
  expect(login.status()).toBe(200);
  expect((await login.json()).user.passwordChangeRequired).toBe(true);
  await context.close();
});
