import { test, expect } from "./test";
import {
  reset,
  adminLogin,
  api,
  confirm,
  noOverflow,
  type Fixture,
} from "./helpers";
let data: Fixture;
test.beforeEach(async ({ request, page }) => {
  data = await reset(request);
  await adminLogin(page);
});

test("Admin sidebar keeps every destination accessible on mobile and desktop", async ({
  page,
}) => {
  const mobile = (page.viewportSize()?.width ?? 1280) < 1024;
  if (mobile)
    await page.getByRole("button", { name: "Open Admin menu" }).click();
  const shell = mobile
    ? page.getByRole("dialog", { name: "Admin menu" })
    : page.getByRole("complementary", { name: "Admin sidebar" });
  const nav = shell.getByRole("navigation", { name: "Admin dashboard" });
  for (const name of [
    "Overview",
    "Sellers",
    "Stores",
    "Products",
    "Shipping",
    "Support requests",
    "Payouts & earnings",
    "Reviews",
    "Notifications",
    "Admin Settings",
  ])
    await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Overview", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(shell.getByText("Customer app", { exact: true })).toHaveCount(0);
  await expect(
    shell.getByRole("link", { name: "Account settings", exact: true }),
  ).toHaveCount(0);
  await expect(
    shell.getByRole("button", { name: "Refresh data", exact: true }),
  ).toHaveCount(0);
  await expect(shell.getByText("Admin account", { exact: true })).toHaveCount(
    0,
  );
  await noOverflow(page);
  if (mobile) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Admin menu" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Open Admin menu" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Open Admin menu" }).click();
  }
  await shell.getByRole("link", { name: "Sellers", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/sellers$/);
  if (mobile)
    await expect(page.getByRole("dialog", { name: "Admin menu" })).toHaveCount(
      0,
    );
  await noOverflow(page);
});

test("Overview period, queue links, route reload and browser history", async ({
  page,
}, info) => {
  await expect(
    page.getByText("Cleared commission this month", { exact: true }),
  ).toBeVisible();
  if (info.project.name.includes("chromium"))
    await page.screenshot({
      path: `test-results/visuals/${info.project.name}-admin.png`,
      fullPage: true,
    });
  const analyticsResponse = () =>
    page.waitForResponse((response) =>
      response.url().includes("/admin/analytics?days=30"),
    );
  const selected = analyticsResponse();
  await page.getByLabel("Analytics period").selectOption("30");
  expect((await selected).status()).toBe(200);
  await (await selected).finished();
  await expect(page).toHaveURL(/days=30/);
  const restored = analyticsResponse();
  await page.reload();
  expect((await restored).status()).toBe(200);
  await (await restored).finished();
  await expect(page.getByLabel("Analytics period")).toHaveValue("30");
  await page.goto("/admin/stores?status=approved");
  await expect(
    page.getByRole("link", { name: "Review Isolated Fashion" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Review Isolated Fashion" }).click();
  await expect(page).toHaveURL(new RegExp(data.storeId));
  await page.goBack();
  await expect(page).toHaveURL(/status=approved/);
  await noOverflow(page);
});

test("Stores: private document, revisioned approval, rejection and active controls", async ({
  page,
}) => {
  await page.goto(`/admin/stores/${data.pendingStoreId}`);
  await page.getByRole("button", { name: "Aadhaar card", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Aadhaar card" });
  await expect(preview.getByRole("img")).toHaveJSProperty("naturalWidth", 32);
  await preview.getByRole("button", { name: /Close/i }).click();
  await page
    .getByRole("button", { name: "Approve store", exact: true })
    .click();
  await confirm(page, "Approve this store?");
  await expect(
    page.getByText("Store approved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Review feedback")
    .fill("Temporarily closed for maintenance");
  await page
    .getByRole("button", { name: "Disable store", exact: true })
    .click();
  await confirm(page, "Disable this store?");
  await expect(
    page.getByText("Store disabled.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enable store", exact: true }).click();
  await confirm(page, "Enable this store?");
  await expect(page.getByText("Store enabled.", { exact: true })).toBeVisible();
  const persisted = await (
    await api(page, `/admin/stores/${data.pendingStoreId}`)
  ).json();
  expect(persisted.store.isActive).toBe(true);
  expect(persisted.store.reviewHistory.length).toBeGreaterThanOrEqual(3);
  await page.goto(`/admin/stores/${data.rejectionStoreId}`);
  await page
    .getByLabel("Review feedback")
    .fill("The supplied registration details need correction.");
  await page
    .getByRole("button", { name: "Reject request", exact: true })
    .click();
  await confirm(page, "Reject this request?");
  await expect(
    page.getByText("Request rejected.", { exact: true }),
  ).toBeVisible();
  await noOverflow(page);
});

test("Product moderation: exact reviewed version, rejection reason and approval", async ({
  page,
}) => {
  await page.goto(`/admin/products/${data.pendingProductId}`);
  await expect(
    page.getByRole("heading", { name: "New product submission" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "View Pending Cotton Shirt photo 1",
      exact: true,
    })
    .click();
  const productPhoto = page.getByRole("dialog", {
    name: "Product photo",
    exact: true,
  });
  await expect(productPhoto.getByRole("img")).toHaveJSProperty(
    "naturalWidth",
    32,
  );
  await productPhoto
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("button", { name: "Reject with reason" }).click();
  await expect(
    page.getByText("Enter a rejection reason (at least 3 characters).", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Rejection reason")
    .fill("Please provide clearer product information.");
  await page.getByRole("button", { name: "Reject with reason" }).click();
  await expect(
    page
      .getByText("Please provide clearer product information.", { exact: true })
      .first(),
  ).toBeVisible();
  // Fresh isolated fixture for the independent approval branch.
  data = await reset(page.request);
  await page.context().clearCookies();
  await adminLogin(page);
  await page.goto(`/admin/products/${data.pendingProductId}`);
  await page.getByRole("button", { name: "Approve reviewed version" }).click();
  await expect(
    page.getByRole("button", { name: "Approve reviewed version" }),
  ).toHaveCount(0);
  await page.goto("/admin/products");
  await expect(
    page.getByRole("heading", { name: /Product/ }).first(),
  ).toBeVisible();
  await noOverflow(page);
});

test("Shipping search validation, date/queue filters, details, label QR and PDF", async ({
  page,
}) => {
  await page.goto("/admin/shipping");
  await expect(
    page.getByLabel("Order queue", { exact: true }).locator("option").first(),
  ).toContainText(/All \(\d+\)/);
  await page.getByLabel("Search by full or short Order ID").fill("bad");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "8-character" }),
  ).toBeVisible();
  await page.getByLabel("Search by full or short Order ID").fill(data.orderId);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(data.orderId));
  await expect(
    page.getByRole("link", { name: /View order details/ }),
  ).toHaveCount(1);
  await page.getByRole("link", { name: /View order details/ }).click();
  await expect(
    page.getByRole("heading", { name: "Customer & delivery" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Generate shipping label", exact: true })
    .click();
  await expect(page).toHaveURL(/\/label$/);
  await expect(
    page.getByRole("img", { name: "Shipping QR code" }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const pdf = Buffer.concat(chunks);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.length).toBeGreaterThan(5000);
  // Verify popup content and the print gesture; physical printing is manual.
  await page.context().addInitScript(() => {
    window.print = () => {};
  });
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Print label", exact: true }).click();
  const popup = await popupPromise;
  await expect(popup.locator("body")).toContainText("Isolated Buyer");
  await popup.close();
  await noOverflow(page);
});

test("Dispatch settings validation and persisted backend contract", async ({
  page,
}) => {
  await page.goto("/admin/shipping/settings");
  await page.getByLabel("Dispatch cutoff", { exact: true }).fill("25:99");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "HH:MM" }),
  ).toBeVisible();
  await page.getByLabel("Dispatch cutoff", { exact: true }).fill("15:30");
  await page.getByLabel("Default ETA days", { exact: true }).fill("3");
  await page.getByLabel("Low stock threshold", { exact: true }).fill("4");
  await page
    .getByLabel("Dispatch holidays", { exact: true })
    .fill("2027-01-01");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    page.getByText("Settings saved.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Dispatch cutoff", { exact: true })).toHaveValue(
    "15:30",
  );
  await expect(
    page.getByLabel("Low stock threshold", { exact: true }),
  ).toHaveValue("4");
  await noOverflow(page);
});

test("Review moderation and audit history", async ({ page }) => {
  await page.goto("/admin/reviews");
  await expect(
    page.getByText("Comfortable shirt", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Moderation reason")
    .fill("Isolated moderation acceptance reason");
  await page.getByRole("button", { name: "Hide review", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Restore review", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View audit history", exact: true })
    .click();
  await expect(
    page.getByText("Isolated moderation acceptance reason", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Moderation reason")
    .fill("Restored after an isolated review");
  await page
    .getByRole("button", { name: "Restore review", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Hide review", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
});

test("Notifications route to actual Admin order details; legacy returns stay read-only", async ({
  page,
}) => {
  await page.goto("/admin/notifications");
  await page
    .getByRole("link", { name: "View order: Order updated", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/admin/shipping/${data.orderId}`));
  await expect(
    page.getByRole("heading", { name: "Customer & delivery", exact: true }),
  ).toBeVisible();
  await page.goto(`/admin/support/earlier/${data.legacyOrderId}`);
  await expect(page.getByText(/read.only/i).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /refund|Approve|Reject|Confirm update/i }),
  ).toHaveCount(0);
  await noOverflow(page);
});
