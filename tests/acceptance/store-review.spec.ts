import { test, expect } from "./test";
import {
  adminLogin,
  api,
  confirm,
  noOverflow,
  workspaceLogin,
  reset,
} from "./helpers";
import type { Page } from "@playwright/test";

async function advanceExistingStore(page: Page) {
  for (let step = 0; step < 3; step++)
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Payout method", { exact: true })).toBeVisible();
  await page
    .getByLabel("I have read and accept the Seller Terms.", { exact: true })
    .check();
}

test("Proposed store changes retain live details until Admin rejection or approval", async ({
  page,
  browser,
}) => {
  const data = await reset(page.request);
  await adminLogin(page);
  const sellerContext = await browser.newContext();
  const seller = await sellerContext.newPage();
  await workspaceLogin(seller);
  async function propose(name: string) {
    await seller.goto("/seller/store/edit");
    await seller.getByLabel("Store name", { exact: true }).fill(name);
    await seller
      .getByLabel("Store category", { exact: true })
      .selectOption("Fashion");
    await advanceExistingStore(seller);
    await seller
      .getByRole("button", { name: "Submit changes for review", exact: true })
      .click();
    await expect(
      seller.getByText(
        "Changes pending review. Your approved details remain active.",
        { exact: true },
      ),
    ).toBeVisible();
    const live = await (await api(seller, "/stores/me")).json();
    expect(live.store.storeName).toBe("Isolated Fashion");
    await page.goto(`/admin/stores/${data.storeId}`);
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
  await propose("Proposed name rejected");
  await page
    .getByLabel("Review feedback", { exact: true })
    .fill("Keep the current registered store name.");
  await page
    .getByRole("button", { name: "Reject request", exact: true })
    .click();
  await confirm(page, "Reject this request?");
  await expect(
    page.getByText("Request rejected.", { exact: true }),
  ).toBeVisible();
  const rejected = await (await api(seller, "/stores/me")).json();
  expect(rejected.store.status).toBe("approved");
  expect(rejected.store.storeName).toBe("Isolated Fashion");
  expect(rejected.store.changesPending).toBe(false);
  await propose("Approved revised fashion");
  await page
    .getByRole("button", { name: "Approve store", exact: true })
    .click();
  await confirm(page, "Approve this store?");
  await expect(
    page.getByText("Store approved.", { exact: true }),
  ).toBeVisible();
  const accepted = await (await api(seller, "/stores/me")).json();
  expect(accepted.store.storeName).toBe("Approved revised fashion");
  expect(accepted.store.changesPending).toBe(false);
  await noOverflow(seller);
  await sellerContext.close();
});

test("Rejected owner corrects and resubmits with validated bank details and remains unapproved", async ({
  page,
  browser,
}) => {
  const data = await reset(page.request);
  await adminLogin(page);
  const rejected = await (
    await api(page, `/admin/stores/${data.rejectedStoreId}`)
  ).json();
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  await workspaceLogin(owner, rejected.store.mobileNumber);
  await expect(
    owner.getByText("Registration rejected", { exact: true }),
  ).toBeVisible();
  await owner
    .getByRole("link", { name: "Correct and resubmit", exact: true })
    .click();
  await owner
    .getByLabel("Store name", { exact: true })
    .fill("Corrected local shop");
  await owner
    .getByLabel("Store category", { exact: true })
    .selectOption("Fashion");
  await advanceExistingStore(owner);
  await owner.getByLabel("Payout method", { exact: true }).selectOption("bank");
  await owner
    .getByLabel("Account holder", { exact: true })
    .fill("Isolated Owner");
  await owner
    .getByLabel("Account number", { exact: true })
    .fill("100000000001");
  await owner.getByLabel("IFSC", { exact: true }).fill("BAD");
  await owner
    .getByRole("button", { name: "Submit changes for review", exact: true })
    .click();
  await expect(
    owner.getByText("Enter a valid 11-character IFSC code.", { exact: true }),
  ).toBeVisible();
  await owner.getByLabel("IFSC", { exact: true }).fill("SBIN0001234");
  await owner
    .getByRole("button", { name: "Submit changes for review", exact: true })
    .click();
  await expect(
    owner.getByText("Pending review", { exact: true }),
  ).toBeVisible();
  expect((await api(owner, "/seller/session")).status()).toBe(403);
  const saved = await (await api(owner, "/stores/me/details")).json();
  expect(saved.store.status).toBe("pending");
  expect(saved.store.payout.method).toBe("bank");
  expect(saved.store.payout.ifsc).toBe("SBIN0001234");
  await noOverflow(owner);
  await ownerContext.close();
});
