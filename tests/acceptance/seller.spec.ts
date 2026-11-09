import { test, expect } from "./test";
import {
  reset,
  workspaceLogin,
  api,
  confirm,
  noOverflow,
  type Fixture,
} from "./helpers";
let data: Fixture;
test.beforeEach(async ({ request, page }) => {
  data = await reset(request);
  await workspaceLogin(page);
});

test("Seller availability, ownership isolation and browser notification links", async ({
  page,
}) => {
  const availability = page.getByRole("switch", { name: "Store availability" });
  await expect(
    page.getByText("Ready for payout", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("On hold / upcoming", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Total received", { exact: true })).toBeVisible();
  await page.locator('a[href="/seller/orders?queue=active"]').click();
  await expect(page.getByLabel("Order queue", { exact: true })).toHaveValue(
    "active",
  );
  await page.goBack();
  await expect(availability).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByRole("button", { name: "Switch to Customer Mode", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Refresh data", exact: true }),
  ).toHaveCount(0);
  await availability.click();
  await expect(availability).toHaveAttribute("aria-checked", "false");
  await page.reload();
  await expect(availability).toHaveAttribute("aria-checked", "false");
  await availability.click();
  await expect(availability).toHaveAttribute("aria-checked", "true");
  expect(
    (await api(page, `/seller/products/${data.foreignProductId}`)).status(),
  ).toBe(404);
  await page.goto(`/seller/orders/${data.foreignOrderId}`);
  await expect(
    page.getByRole("alert").filter({ hasText: "unavailable to your store" }),
  ).toBeVisible();
  await expect(
    page.getByText("Foreign Store Shirt", { exact: true }),
  ).toHaveCount(0);
  await page.goto("/seller/notifications");
  await page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Order updated", exact: true }),
    })
    .getByRole("link", { name: /View order/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`/seller/orders/${data.orderId}`));
  await expect(
    page.getByRole("heading", { name: "Items to fulfil" }),
  ).toBeVisible();
  await noOverflow(page);
});

test("Catalogue status, URL search, live inventory, archive/restore/delete", async ({
  page,
}) => {
  await page.goto(`/seller/products/${data.productId}/inventory`);
  await page.getByLabel("Stock quantity 1", { exact: true }).fill("23");
  await page.getByRole("button", { name: "Update stock", exact: true }).click();
  await expect(page).toHaveURL(/\/seller\/products$/);
  const saved = await (
    await api(page, `/seller/products/${data.productId}`)
  ).json();
  expect(saved.product.stock).toBe(23);
  await page.getByLabel("Search your products").fill("Live Cotton");
  await expect(page).toHaveURL(/search=Live/);
  const live = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Live Cotton Shirt",
      exact: true,
    }),
  });
  await live
    .getByRole("button", { name: "Make inactive", exact: true })
    .click();
  await expect(
    live.getByRole("button", { name: "Make active", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search your products").fill("Archive Me");
  const archived = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Archive Me", exact: true }),
  });
  await archived.getByRole("button", { name: "Archive", exact: true }).click();
  await confirm(page, "Archive product?");
  await page.getByLabel("Catalogue view").selectOption("true");
  await archived
    .getByRole("button", { name: "Restore product", exact: true })
    .click();
  await confirm(page, "Restore product?");
  await expect(archived).toHaveCount(0);
  await page.getByLabel("Catalogue view").selectOption("false");
  await page.getByLabel("Search your products").fill("Delete Me");
  const removed = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Delete Me", exact: true }),
  });
  await removed.getByRole("button", { name: "Delete", exact: true }).click();
  await confirm(page, "Delete product?");
  await expect(removed).toHaveCount(0);
  await noOverflow(page);
});

test("Product creation validates prices, prepares browser photos and submits a real pending product", async ({
  page,
}) => {
  await page.goto("/seller/products/new");
  await page
    .getByLabel("Product name", { exact: true })
    .fill("Browser Created Shirt");
  await page.getByLabel("Category", { exact: true }).selectOption("Fashion");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A cotton shirt created through the browser form.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Selling price (₹)", { exact: true }).fill("700");
  await page.getByLabel("MRP (₹)", { exact: true }).fill("600");
  await page.getByLabel("Stock quantity", { exact: true }).fill("7");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByText("Add general photos", { exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "isolated.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(data.photo.split(",")[1], "base64"),
  });
  await expect(
    page.getByRole("img", { name: "General product photos 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Selling price" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "2. Stock & sizes", exact: true })
    .click();
  await page.getByLabel("Selling price (₹)", { exact: true }).fill("500");
  await page.getByRole("button", { name: "3. Photos", exact: true }).click();
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(page).toHaveURL(/\/seller\/products$/);
  const response = await (await api(page, "/seller/products?page=1")).json();
  const created = response.products.find(
    (product: { name: string }) => product.name === "Browser Created Shirt",
  );
  expect(created.moderationStatus).toBe("pending");
  expect(created.stock).toBe(7);
  await page
    .locator("section")
    .filter({
      has: page.getByRole("heading", {
        name: "Browser Created Shirt",
        exact: true,
      }),
    })
    .getByRole("link", { name: "Edit product", exact: true })
    .click();
  await expect(page.getByLabel("Product name", { exact: true })).toHaveValue(
    "Browser Created Shirt",
  );
  await noOverflow(page);
});

test("Owned order viewed marker, stock issue block and explicit handover confirmation", async ({
  page,
}) => {
  await page.goto(`/seller/orders/${data.orderId}`);
  await expect(
    page.getByRole("heading", { name: "Customer & delivery" }),
  ).toBeVisible();
  await page
    .getByLabel("Stock issue details")
    .fill("One unit is damaged; waiting for replacement stock.");
  await page
    .getByRole("button", { name: "Report to admin", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Mark Dispatched", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/Admin has been alerted/)).toBeVisible();
  // Independent order without an open issue remains dispatchable.
  await page.goto(`/seller/orders/${data.attentionOrderId}`);
  // The seeded attention order has a stock issue, so use a fresh isolated fixture.
  data = await reset(page.request);
  await page.context().clearCookies();
  await workspaceLogin(page);
  await page.goto(`/seller/orders/${data.orderId}`);
  await page
    .getByRole("button", { name: "Mark Dispatched", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Confirm handover to admin",
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    (await (await api(page, "/seller/orders?page=1")).json()).orders.find(
      (order: { id: string }) => order.id === data.orderId,
    ).status,
  ).toBe("placed");
  await page
    .getByRole("button", { name: "Mark Dispatched", exact: true })
    .click();
  await confirm(page, "Confirm handover to admin");
  await expect(
    page.getByRole("button", { name: "Mark Dispatched", exact: true }),
  ).toHaveCount(0);
  const persisted = (
    await (await api(page, "/seller/orders?page=1")).json()
  ).orders.find((order: { id: string }) => order.id === data.orderId);
  expect(persisted.status).toBe("dispatched");
  await noOverflow(page);
});

test("Seller replies require policy acceptance; private earnings remain read-only", async ({
  page,
}) => {
  await page.goto("/seller/reviews");
  await page
    .getByLabel("Seller reply", { exact: true })
    .fill("Thank you for sharing your experience.");
  await expect(
    page.getByRole("button", { name: "Save reply", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("I accept the review content policy").check();
  await page.getByRole("button", { name: "Save reply", exact: true }).click();
  await expect(
    page.getByText("Thank you for sharing your experience.", { exact: true }),
  ).toBeVisible();
  const earningsLink = page.getByRole("link", {
    name: "Payouts & earnings",
    exact: true,
  });
  if ((page.viewportSize()?.width ?? 1280) < 1024) {
    await page.getByRole("button", { name: "Open seller menu" }).click();
    await page
      .getByRole("dialog", { name: "Seller menu" })
      .getByRole("link", { name: "Payouts & earnings", exact: true })
      .click();
  } else {
    await earningsLink.click();
  }
  await expect(
    page.getByRole("heading", { name: "My earnings", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("isolated@bank", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Earnings", exact: true }).click();
  await page.getByLabel("Statement period").selectOption("month");
  await expect(page).toHaveURL(/period=month/);
  await expect(
    page.getByRole("button", {
      name: /Verify collected|Record completed payout/,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByText(/Paid in selected period/)).toBeVisible();
  await noOverflow(page);
});

test("Seller store editing preserves owner identity, documents and review workflow", async ({
  page,
}) => {
  await page.goto("/seller/store");
  await page
    .getByRole("link", { name: "Edit store details", exact: true })
    .click();
  await expect(
    page.getByLabel("Seller login number", { exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Store name", { exact: true })
    .fill("Updated Isolated Fashion");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("img").first()).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("I have read and accept the Seller Terms.").check();
  await page
    .getByRole("button", { name: "Submit changes for review", exact: true })
    .click();
  await expect(page).toHaveURL(/\/seller\/store$/);
  await expect(
    page.getByText(
      "Changes pending review. Your approved details remain active.",
      { exact: true },
    ),
  ).toBeVisible();
  const result = await (await api(page, "/stores/me")).json();
  expect(result.store.changesPending).toBe(true);
  expect(result.store.storeName).toBe("Isolated Fashion");
  await noOverflow(page);
});
