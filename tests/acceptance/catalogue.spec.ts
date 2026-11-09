import { test, expect } from "./test";
import {
  reset,
  workspaceLogin,
  adminLogin,
  api,
  noOverflow,
  type Fixture,
} from "./helpers";
let data: Fixture;
test.beforeEach(async ({ request }) => {
  data = await reset(request);
});
test("Color/size stock and sequential browser photos preserve earlier successful uploads", async ({
  page,
}) => {
  await workspaceLogin(page);
  await page.goto("/seller/products/new");
  await page
    .getByLabel("Product name", { exact: true })
    .fill("Blue Variant Shirt");
  await page.getByLabel("Category", { exact: true }).selectOption("Fashion");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Cotton blue variant shirt for isolated testing");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Selling price (₹)", { exact: true }).fill("500");
  await page.getByLabel("MRP (₹)", { exact: true }).fill("600");
  await page.getByLabel("Size options", { exact: true }).selectOption("adult");
  await page.getByRole("button", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "L", exact: true }).click();
  await page.getByRole("button", { name: "Add color", exact: true }).click();
  await page.getByLabel("Color 1 name", { exact: true }).fill("Blue");
  await page.getByLabel("Stock Blue M", { exact: true }).fill("2");
  await page.getByLabel("Stock Blue L", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByText("Add Blue photos", { exact: true }).click();
  await (
    await chooserPromise
  ).setFiles([
    {
      name: "blue.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(data.photo.split(",")[1], "base64"),
    },
    {
      name: "unsupported.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("invalid image"),
    },
  ]);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Choose a JPEG, PNG or WebP image." }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Blue photos 1", exact: true }),
  ).toHaveJSProperty("naturalWidth", 32);
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(page).toHaveURL(/\/seller\/products$/);
  const products = (await (await api(page, "/seller/products?page=1")).json())
    .products;
  const created = products.find(
    (product: { name: string }) => product.name === "Blue Variant Shirt",
  );
  const product = (
    await (await api(page, `/seller/products/${created.id}`)).json()
  ).product;
  expect(product.stock).toBe(5);
  expect(product.colors[0].images).toHaveLength(1);
  expect(
    product.variantStock.map((variant: { stock: number }) => variant.stock),
  ).toEqual([2, 3]);
  await noOverflow(page);
});

test("Stale inventory cannot overwrite newer stock; refresh recovers the editor", async ({
  page,
}) => {
  await workspaceLogin(page);
  await page.goto(`/seller/products/${data.productId}/inventory`);
  await expect(
    page.getByLabel("Stock quantity 1", { exact: true }),
  ).toHaveValue("20");
  expect(
    (
      await api(page, `/seller/products/${data.productId}/inventory`, "PATCH", {
        stock: 22,
        variantStock: [],
        expectedInventoryRevision: 0,
      })
    ).status(),
  ).toBe(200);
  await page.getByLabel("Stock quantity 1", { exact: true }).fill("24");
  await page.getByRole("button", { name: "Update stock", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: /changed|Refresh|updated/i }),
  ).toBeVisible();
  expect(
    (await (await api(page, `/seller/products/${data.productId}`)).json())
      .product.stock,
  ).toBe(22);
  await page.reload();
  await expect(
    page.getByLabel("Stock quantity 1", { exact: true }),
  ).toHaveValue("22");
  await page.getByLabel("Stock quantity 1", { exact: true }).fill("24");
  await page.getByRole("button", { name: "Update stock", exact: true }).click();
  await expect(page).toHaveURL(/\/seller\/products$/);
  await noOverflow(page);
});

test("Stale Admin product decision refetches the current review instead of overwriting it", async ({
  page,
}) => {
  await adminLogin(page);
  await page.goto(`/admin/products/${data.pendingProductId}`);
  await expect(
    page.getByRole("button", { name: "Approve reviewed version", exact: true }),
  ).toBeEnabled();
  expect(
    (
      await api(
        page,
        `/admin/products/${data.pendingProductId}/review`,
        "POST",
        {
          submissionVersion: 1,
          decision: "rejected",
          reason: "Another reviewer requested clearer details",
        },
      )
    ).status(),
  ).toBe(200);
  await page
    .getByRole("button", { name: "Approve reviewed version", exact: true })
    .click();
  await expect(
    page.getByText("Another reviewer requested clearer details", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve reviewed version", exact: true }),
  ).toHaveCount(0);
  const current = (
    await (await api(page, `/admin/products/${data.pendingProductId}`)).json()
  ).product;
  expect(current.moderationStatus).toBe("rejected");
  await noOverflow(page);
});
