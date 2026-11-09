import { test, expect } from "./test";
import {
  control,
  adminLogin,
  workspaceLogin,
  noOverflow,
  type Fixture,
} from "./helpers";
import type { Page } from "@playwright/test";
async function loadAll(page: Page, label: string, apiPath: string) {
  const button = page.getByRole("button", { name: label, exact: true });
  await expect(button).toBeVisible();
  let requests = 0;
  while (await button.count()) {
    if (++requests > 8) throw new Error("Pagination did not terminate.");
    const before = await page.locator("main").innerText();
    const response = page.waitForResponse(
      (response) =>
        response.url().includes(apiPath) &&
        response.request().method() === "GET",
    );
    await button.click();
    expect((await response).status()).toBe(200);
    await (await response).finished();
    await expect.poll(() => page.locator("main").innerText()).not.toBe(before);
    await expect
      .poll(async () => !(await button.count()) || (await button.isEnabled()))
      .toBe(true);
  }
  expect(requests).toBeGreaterThan(0);
}

async function statementFilters(page: Page, role: "admin" | "seller") {
  await page.goto(`/${role}/earnings?tab=Orders&period=month`);
  const pagination = page.getByRole("navigation", {
    name: "Pagination",
    exact: true,
  });
  await pagination.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(pagination.getByText("Page 2", { exact: true })).toBeVisible();
  await pagination
    .getByRole("button", { name: "Previous", exact: true })
    .click();
  await expect(page).toHaveURL(/page=1/);
  const date = page.getByLabel("Statement date", { exact: true });
  const original = await date.inputValue();
  await page
    .getByRole("button", { name: "Previous period", exact: true })
    .click();
  await expect(date).not.toHaveValue(original);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(date).toHaveValue(original);
  await page
    .getByLabel("Statement period", { exact: true })
    .selectOption("week");
  await page
    .getByLabel("Settlement state", { exact: true })
    .selectOption("return_open");
  await expect(page).toHaveURL(/state=return_open/);
  await expect(page.getByText("Page 1", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Settlement state", { exact: true }),
  ).toHaveValue("return_open");
  await expect(
    page.getByLabel("Statement period", { exact: true }),
  ).toHaveValue("week");
}

test("Real cursor/page pagination covers stores, moderation, support, inbox, reviews, catalogue and owned-order deep links", async ({
  page,
  browser,
}) => {
  const data: Fixture = await control(
    page.request,
    "/reset?scenario=pagination",
    "POST",
  );
  await adminLogin(page);
  await page.goto("/admin/stores");
  await expect(
    page.getByRole("button", { name: "Load more stores", exact: true }),
  ).toBeVisible();
  await loadAll(page, "Load more stores", "/admin/stores?");
  await expect(
    page.getByRole("link", { name: "Review Pending Shop", exact: true }),
  ).toBeVisible();
  await page.goto("/admin/products?status=all");
  await loadAll(page, "Load more products", "/admin/products?");
  await expect(
    page.getByRole("heading", { name: "Live Cotton Shirt", exact: true }),
  ).toBeVisible();
  await page.goto("/admin/support");
  await loadAll(page, "Load more requests", "/returns/admin?");
  await expect(page.getByRole("link", { name: /Open request/ })).toHaveCount(
    40,
  );
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    page.getByText("No records match these filters.", { exact: true }),
  ).toBeVisible();
  await page.goto("/admin/notifications");
  await loadAll(page, "Load more notifications", "/notifications/inbox?");
  await expect(
    page.getByRole("link", { name: "View order: Order updated", exact: true }),
  ).toBeVisible();
  await page.goto("/admin/reviews");
  await loadAll(page, "Load more reviews", "/reviews/admin?");
  await expect(
    page.getByText("Comfortable shirt", { exact: true }),
  ).toBeVisible();
  await page.goto("/admin/shipping");
  await loadAll(page, "Load more orders", "/admin/shipping/orders?");
  await page.getByLabel("Search mode", { exact: true }).selectOption("phone");
  await page
    .getByLabel("Search customer by phone", { exact: true })
    .fill(data.buyerPhone);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await loadAll(page, "Load more orders", "/admin/shipping/orders/search?");
  await expect(
    page.getByRole("link", { name: "View order details", exact: false }),
  ).toHaveCount(47);
  await statementFilters(page, "admin");
  const sellerContext = await browser.newContext();
  const seller = await sellerContext.newPage();
  await workspaceLogin(seller);
  await seller.goto("/seller/products");
  await loadAll(seller, "Load more products", "/seller/products?");
  await seller.getByLabel("Search your products").fill("Live Cotton");
  await expect(
    seller.getByRole("heading", { name: "Live Cotton Shirt", exact: true }),
  ).toBeVisible();
  await seller.goto("/seller/orders");
  await loadAll(seller, "Load more orders", "/seller/orders?");
  await seller
    .getByRole("link", {
      name: `View order ${data.orderId.slice(-8)}`,
      exact: true,
    })
    .click();
  await expect(
    seller.getByRole("heading", { name: "Items to fulfil", exact: true }),
  ).toBeVisible();
  await statementFilters(seller, "seller");
  await noOverflow(seller);
  await sellerContext.close();
  await noOverflow(page);
});
