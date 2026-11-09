import { test, expect } from "./test";
import {
  reset,
  adminLogin,
  workspaceLogin,
  customerOtpLogin,
  api,
  confirm,
  noOverflow,
  type Fixture,
} from "./helpers";
let data: Fixture;
test.beforeEach(async ({ request }) => {
  data = await reset(request);
});

test("Current-password change revokes every real session and permits only the new password", async ({
  page,
  browser,
}) => {
  await adminLogin(page);
  const second = await browser.newContext();
  const other = await second.newPage();
  await adminLogin(other);
  await page.goto("/admin/settings");
  const next = `${process.env.WEB_TEST_ADMIN_PASSWORD}-changed`;
  await page
    .getByLabel("Current password", { exact: true })
    .fill("wrong-isolated-password");
  await page.getByLabel("New password", { exact: true }).fill(next);
  await page.getByLabel("Confirm new password", { exact: true }).fill(next);
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: /password|credentials/i }),
  ).toBeVisible();
  await page
    .getByLabel("Current password", { exact: true })
    .fill(process.env.WEB_TEST_ADMIN_PASSWORD!);
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?passwordChanged=1/);
  expect((await api(other, "/auth/me")).status()).toBe(401);
  expect((await api(page, "/auth/me")).status()).toBe(401);
  await page
    .getByLabel("Mobile Number", { exact: true })
    .fill(process.env.WEB_TEST_ADMIN_PHONE!);
  await page.getByLabel("Password", { exact: true }).fill(next);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await second.close();
});

test("Password rate limiting preserves customer OTP without Admin elevation", async ({
  page,
}) => {
  const statuses = [];
  for (let attempt = 0; attempt < 12; attempt++)
    statuses.push(
      (
        await api(page, "/auth/password/login", "POST", {
          phone: process.env.WEB_TEST_ADMIN_PHONE,
          password: "wrong-isolated-password",
        })
      ).status(),
    );
  expect(statuses).toContain(429);
  expect(statuses.every((status) => [401, 429].includes(status))).toBe(true);
  const customer = await customerOtpLogin(
    page,
    process.env.WEB_TEST_ADMIN_PHONE!,
  );
  expect(customer.user.roles).toEqual(["customer"]);
  expect((await api(page, "/admin/stores")).status()).toBe(403);
});

test("Admin resolves a Seller stock issue through the existing Attention workflow", async ({
  page,
  browser,
}) => {
  await workspaceLogin(page);
  await page.goto(`/seller/orders/${data.orderId}`);
  await page
    .getByLabel("Stock issue details")
    .fill("Damaged unit found before dispatch");
  await page
    .getByRole("button", { name: "Report to admin", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Mark Dispatched", exact: true }),
  ).toBeDisabled();
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await adminLogin(admin);
  await admin.goto("/admin/shipping?tab=attention");
  const card = admin.locator("section").filter({
    has: admin.getByRole("heading", {
      name: `#${data.orderId.slice(-8).toUpperCase()}`,
      exact: true,
    }),
  });
  await card
    .getByLabel("Stock issue resolution")
    .fill("Replacement stock checked with seller");
  await card
    .getByRole("button", { name: "Resolve issue", exact: true })
    .click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Mark Dispatched", exact: true }),
  ).toBeEnabled();
  await adminContext.close();
});

test("Support chat/evidence, pickup, inspection and confirmed manual refund", async ({
  page,
}) => {
  await adminLogin(page);
  await page.goto(`/admin/support/${data.deliveredOrderId}/${data.caseId}`);
  await page
    .getByLabel("Message to customer")
    .fill("We will arrange collection for this parcel.");
  await page
    .getByRole("button", { name: "Attach photos", exact: true })
    .click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByText("Choose photo", { exact: true }).click();
  await (
    await chooserPromise
  ).setFiles({
    name: "evidence.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(data.photo.split(",")[1], "base64"),
  });
  await expect(
    page.getByRole("button", { name: "Remove", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText("We will arrange collection for this parcel.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Manage", exact: true }).click();
  async function action(
    value: string,
    confirmationLabel: string,
    title: string,
  ) {
    await page
      .getByLabel("Request action", { exact: true })
      .selectOption(value);
    await page
      .getByLabel("Message for customer / action notes", { exact: true })
      .fill("Verified during isolated acceptance testing");
    await page.getByLabel(confirmationLabel, { exact: true }).check();
    await page
      .getByRole("button", { name: "Confirm update", exact: true })
      .click();
    await confirm(page, title);
  }
  await action(
    "approve",
    "I reviewed the request and approve this return or exchange.",
    "Approve",
  );
  await page
    .getByLabel("Request action", { exact: true })
    .selectOption("schedule");
  await page
    .getByLabel("Collection contact", { exact: true })
    .fill("Isolated collection team");
  await page
    .getByLabel("Booking / arrangement reference", { exact: true })
    .fill("ISOLATED-COLLECT");
  await page
    .getByLabel("Packing and collection instructions", { exact: true })
    .fill("Pack securely with the original tags");
  await action(
    "schedule",
    "The collection window and arrangement are confirmed with the customer.",
    "Schedule collection",
  );
  await action(
    "picked_up",
    "The parcel was physically collected.",
    "Confirm collected",
  );
  await action(
    "received",
    "The returned parcel was physically received.",
    "Confirm received",
  );
  await page
    .getByLabel("Request action", { exact: true })
    .selectOption("inspection_pass");
  await page.getByLabel("Actual received quantity", { exact: true }).fill("1");
  await page.getByLabel(/Delivered Shirt: sellable quantity/).fill("1");
  await action(
    "inspection_pass",
    "I inspected the actual items and confirmed received and sellable quantities.",
    "Accept inspection",
  );
  await page
    .getByLabel("Request action", { exact: true })
    .selectOption("refund_complete");
  await page
    .getByLabel("Refund / cash receipt reference", { exact: true })
    .fill("ISOLATED-REFUND-RECEIPT");
  await action(
    "refund_complete",
    "Payment receipt verified and refund actually completed.",
    "Record completed refund",
  );
  const records = (
    await (
      await api(page, `/returns/admin/orders/${data.deliveredOrderId}`)
    ).json()
  ).cases;
  expect(records[0].status).toBe("refund_completed");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /^Refund completed/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Manage", exact: true }).click();
  await expect(
    page.getByText("ISOLATED-REFUND-RECEIPT", { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
});

test("Admin earnings collections and confirmed idempotent seller payouts", async ({
  page,
}) => {
  await adminLogin(page);
  await page.goto(`/admin/earnings?storeId=${data.storeId}&tab=Orders`);
  const collectionCard = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: `#${data.collectionOrderId.slice(-8).toUpperCase()}`,
      exact: true,
    }),
  });
  await collectionCard
    .getByRole("button", { name: "Verify collected payment", exact: true })
    .click();
  await page
    .getByLabel("Transaction reference", { exact: true })
    .fill("ISOLATED-COLLECTED-CASH");
  await page
    .getByLabel("The full customer payment has been collected.", {
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Confirm record", exact: true })
    .click();
  await confirm(page, "Verify collected payment?");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    collectionCard.getByRole("button", {
      name: "Verify collected payment",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Balances", exact: true }).click();
  await page
    .getByRole("button", { name: "Record completed payout", exact: true })
    .click();
  await page
    .getByLabel("Transaction reference", { exact: true })
    .fill("ISOLATED-PAYOUT-RECEIPT");
  await page
    .getByLabel("I transferred this amount to the saved account.", {
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Confirm record", exact: true })
    .click();
  const nested = page.getByRole("dialog", { name: /^Record .* payout\?$/ });
  await nested
    .getByRole("button", { name: "Confirm record", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    page.getByText("ISOLATED-PAYOUT-RECEIPT", { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
});

test("Complete COD RTO: Admin receipt, Seller receipt/inspection and safe restocking", async ({
  page,
  browser,
}) => {
  await adminLogin(page);
  await page.goto(`/admin/shipping/${data.rtoOrderId}`);
  async function adminAction(label: string) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await confirm(page, `${label}?`);
  }
  await adminAction("Start review");
  await adminAction("Approve recovery");
  await adminAction("Start coordination · Admin receives");
  await page
    .getByLabel("Received quantity for Recover Cotton Shirt", { exact: true })
    .fill("1");
  await page
    .getByLabel("Damaged quantity for Recover Cotton Shirt", { exact: true })
    .fill("0");
  await page
    .getByLabel("RTO Admin note", { exact: true })
    .fill("Counted one intact returned parcel");
  await adminAction("Record physical receipt");
  await adminAction("Record physical handoff to Isolated Fashion");
  const sellerContext = await browser.newContext();
  const seller = await sellerContext.newPage();
  await workspaceLogin(seller);
  await seller.goto(`/seller/orders/${data.rtoOrderId}`);
  await seller
    .getByLabel("Received quantity for Recover Cotton Shirt", { exact: true })
    .fill("1");
  await seller
    .getByRole("button", { name: "Confirm physical receipt", exact: true })
    .click();
  await confirm(seller, "Confirm received quantities?");
  await seller
    .getByLabel("Sellable quantity for Recover Cotton Shirt", { exact: true })
    .fill("1");
  await seller
    .getByRole("button", { name: "Confirm inspection", exact: true })
    .click();
  await confirm(seller, "Record inspected sellable quantities?");
  await page.reload();
  await adminAction("Complete recovery · COD unpaid");
  const order = (
    await (await api(page, `/admin/shipping/${data.rtoOrderId}`)).json()
  ).order;
  expect(order.rto.status).toBe("completed");
  const product = (
    await (await api(seller, `/seller/products/${data.productId}`)).json()
  ).product;
  expect(product.stock).toBe(21);
  await sellerContext.close();
  await noOverflow(page);
});
