import { test, expect } from "./test";
import {
  reset,
  workspaceLogin,
  control,
  api,
  noOverflow,
  type Fixture,
} from "./helpers";
let data: Fixture;
test.beforeEach(async ({ request }) => {
  data = await reset(request);
});
test("New store registration validates steps, four browser documents, payout and consent", async ({
  page,
}) => {
  await workspaceLogin(page, process.env.WEB_TEST_APPLICANT_PHONE);
  await expect(page).toHaveURL(/\/seller\/application$/);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("Enter your store name (at least 2 characters).", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Store name", { exact: true })
    .fill("Browser Registered Shop");
  await page
    .getByLabel("Owner full name", { exact: true })
    .fill("Isolated Applicant");
  await page
    .getByLabel("Store category", { exact: true })
    .selectOption("Fashion");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Full address", { exact: true })).toBeVisible();
  await page
    .getByLabel("Full address", { exact: true })
    .fill("12 Test Market Road, Kupwara, Jammu and Kashmir");
  await page.getByLabel("Area / Locality", { exact: true }).fill("Test Market");
  await page.getByLabel("Pincode", { exact: true }).fill("193222");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  for (const label of [
    "Store front photo",
    "Aadhaar card",
    "PAN card",
    "Shop license",
  ]) {
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByText(`Add ${label}`, { exact: true }).click();
    await (
      await chooserPromise
    ).setFiles({
      name: "document.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(data.photo.split(",")[1], "base64"),
    });
    await expect(
      page.getByRole("img", { name: `${label} preview`, exact: true }),
    ).toHaveJSProperty("naturalWidth", 32);
  }
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Payout method", { exact: true }).selectOption("bank");
  await page
    .getByRole("button", { name: "Submit registration", exact: true })
    .click();
  await expect(
    page.getByText("Enter a bank account number with 9–18 digits.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Payout method", { exact: true }).selectOption("upi");
  await page.getByLabel("UPI ID", { exact: true }).fill("isolated@bank");
  await page
    .getByRole("button", { name: "Read Seller Terms", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Store registration terms",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("I have read and accept the Seller Terms.", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Submit registration", exact: true })
    .click();
  await expect(page.getByText("Pending review", { exact: true })).toBeVisible();
  const saved = await (await api(page, "/stores/me")).json();
  expect(saved.store.storeName).toBe("Browser Registered Shop");
  expect(saved.store.status).toBe("pending");
  expect(saved.store.isActive).toBe(false);
  expect((await api(page, "/seller/session")).status()).toBe(403);
  await noOverflow(page);
});

test("Registering another owner requires genuine phone OTP proof without changing the current identity", async ({
  page,
}) => {
  await workspaceLogin(page, process.env.WEB_TEST_APPLICANT_PHONE);
  await page
    .getByLabel("Store name", { exact: true })
    .fill("Other Owner Application");
  await page
    .getByLabel("Owner full name", { exact: true })
    .fill("Other Isolated Owner");
  await page
    .getByLabel("Store category", { exact: true })
    .selectOption("Fashion");
  // Reuse the already isolated Seller number to test proof only; submitting a
  // duplicate store is deliberately excluded. The existing account must survive.
  await page
    .getByLabel("Seller login number", { exact: true })
    .fill(process.env.WEB_TEST_SELLER_PHONE!);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("Verify this seller number with OTP before continuing.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Send OTP", exact: true }).click();
  await expect(page.getByRole("button", { name: /Resend in/ })).toBeDisabled();
  const { code } = await control(page.request, "/otp");
  await page.getByLabel("Seller number OTP", { exact: true }).fill(code);
  await page
    .getByRole("button", { name: "Verify number", exact: true })
    .click();
  await expect(
    page.getByText("Seller number verified.", { exact: true }),
  ).toBeVisible();
  const account = await (await api(page, "/auth/me")).json();
  expect(account.user.id).toBe(data.applicantId);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Full address", { exact: true })).toBeVisible();
  await noOverflow(page);
});
