import { randomUUID } from "node:crypto";
import { test, expect } from "./test";
import {
  reset,
  adminLogin,
  api,
  confirm,
  control,
  noOverflow,
  type Fixture,
} from "./helpers";
import type { Page } from "@playwright/test";
let data: Fixture;
test.beforeEach(async ({ request, page }) => {
  data = await reset(request);
  await adminLogin(page);
});
async function record(page: Page, order: string, id: string) {
  return (
    await (await api(page, `/returns/admin/orders/${order}`)).json()
  ).cases.find((item: { id: string }) => item.id === id);
}
async function action(
  page: Page,
  order: string,
  id: string,
  name: string,
  extra = {},
) {
  const current = await record(page, order, id);
  const response = await api(
    page,
    `/returns/admin/orders/${order}/${id}/actions`,
    "POST",
    {
      action: name,
      version: current.version,
      clientKey: randomUUID(),
      note: "Verified in the isolated test fixture",
      ...extra,
    },
  );
  expect(response.status(), `Existing support action ${name}`).toBe(200);
  return (await response.json()).case;
}
async function inspectionSetup(page: Page, order: string, id: string) {
  // Arrange earlier physical stages using the unchanged real API; test the
  // specific branch through the web UI, with all versions validated by MongoDB.
  await action(page, order, id, "approve");
  await action(page, order, id, "schedule", {
    acceptAddressChange: true,
    pickup: {
      mode: "pickup",
      start: new Date(Date.now() + 86400000).toISOString(),
      end: new Date(Date.now() + 90000000).toISOString(),
      contact: "Isolated team",
      reference: "ISOLATED-BOOKING",
      instructions: "Pack with original tags",
    },
  });
  await action(page, order, id, "picked_up");
  await action(page, order, id, "received");
}
async function uiAction(page: Page, value: string, title: string) {
  await page.getByLabel("Request action", { exact: true }).selectOption(value);
  await page
    .getByLabel("Message for customer / action notes", { exact: true })
    .fill("Verified isolated branch action");
  const checkbox = page.getByRole("checkbox");
  if (await checkbox.count()) await checkbox.check();
  await page
    .getByRole("button", { name: "Confirm update", exact: true })
    .click();
  await confirm(page, title);
}

test("Exchange inspection, reserved-stock dispatch and delivered confirmation", async ({
  page,
}) => {
  const order = data.exchangeOrderId;
  const id = data.exchangeCaseId;
  await inspectionSetup(page, order, id);
  await page.goto(`/admin/support/${order}/${id}?tab=details`);
  await page.getByLabel("Actual received quantity", { exact: true }).fill("1");
  await page.getByLabel(/exchange support shirt: sellable quantity/).fill("1");
  await uiAction(page, "inspection_pass", "Accept inspection");
  await page
    .getByLabel("Carrier / delivery partner", { exact: true })
    .fill("Isolated carrier");
  await page
    .getByLabel("Replacement tracking / dispatch reference", { exact: true })
    .fill("ISOLATED-EXCHANGE");
  await uiAction(page, "dispatch_exchange", "Dispatch replacement");
  await uiAction(page, "complete_exchange", "Confirm replacement delivered");
  expect((await record(page, order, id)).status).toBe("exchange_completed");
  await noOverflow(page);
});

test("Inspection dispute evidence, information deadline, customer reply and reasoned closure", async ({
  page,
  browser,
}) => {
  const order = data.disputeOrderId;
  const id = data.disputeCaseId;
  await inspectionSetup(page, order, id);
  await page.goto(`/admin/support/${order}/${id}?tab=details`);
  await page
    .getByLabel("Request action", { exact: true })
    .selectOption("inspection_dispute");
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByText("Choose photo", { exact: true }).click();
  await (
    await chooserPromise
  ).setFiles({
    name: "inspection.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(data.photo.split(",")[1], "base64"),
  });
  await expect(
    page.getByRole("button", { name: "Remove", exact: true }),
  ).toBeVisible();
  await uiAction(page, "inspection_dispute", "Record inspection issue");
  expect((await record(page, order, id)).status).toBe("inspection_disputed");
  await uiAction(page, "ask_information", "Ask for information");
  expect((await record(page, order, id)).status).toBe("information_needed");
  const buyerContext = await browser.newContext();
  const buyer = await buyerContext.newPage();
  expect(
    (
      await api(buyer, "/auth/otp/request", "POST", { phone: data.buyerPhone })
    ).status(),
  ).toBe(202);
  const { code } = await control(buyer.request, "/otp");
  expect(
    (
      await api(buyer, "/auth/otp/verify", "POST", {
        phone: data.buyerPhone,
        code,
      })
    ).status(),
  ).toBe(200);
  const current = await record(page, order, id);
  const reply = await api(
    buyer,
    `/returns/orders/${order}/${id}/actions`,
    "POST",
    {
      action: "reply",
      version: current.version,
      clientKey: randomUUID(),
      note: "Here is the requested inspection explanation.",
      photoIds: [],
    },
  );
  expect(reply.status()).toBe(200);
  await page.reload();
  await uiAction(page, "reject", "Close with reason");
  expect((await record(page, order, id)).status).toBe("rejected");
  await buyerContext.close();
  await noOverflow(page);
});

test("Pickup failure/rescheduling and initial rejection remain stage-restricted", async ({
  page,
}) => {
  const order = data.informationOrderId;
  const id = data.informationCaseId;
  await action(page, order, id, "approve");
  await action(page, order, id, "schedule", {
    acceptAddressChange: true,
    pickup: {
      mode: "dropoff",
      start: new Date(Date.now() + 86400000).toISOString(),
      end: new Date(Date.now() + 90000000).toISOString(),
      contact: "Isolated shop",
      reference: "ISOLATED-DROPOFF",
      instructions: "Bring packed parcel",
    },
  });
  await page.goto(`/admin/support/${order}/${id}?tab=details`);
  await uiAction(page, "pickup_failed", "Pickup failed");
  expect((await record(page, order, id)).status).toBe("pickup_failed");
  await page
    .getByLabel("Collection contact", { exact: true })
    .fill("Isolated shop");
  await page
    .getByLabel("Booking / arrangement reference", { exact: true })
    .fill("ISOLATED-RESCHEDULED");
  await page
    .getByLabel("Packing and collection instructions", { exact: true })
    .fill("Keep the parcel ready");
  await uiAction(page, "schedule", "Schedule collection");
  expect((await record(page, order, id)).status).toBe("pickup_scheduled");
  await page.goto(
    `/admin/support/${data.deliveredOrderId}/${data.caseId}?tab=details`,
  );
  await uiAction(page, "reject", "Reject");
  expect((await record(page, data.deliveredOrderId, data.caseId)).status).toBe(
    "rejected",
  );
  await noOverflow(page);
});

test("Original-payment refunds expose no manual completion or information action", async ({
  page,
}) => {
  await page.goto(
    `/admin/support/${data.originalOrderId}/${data.originalCaseId}?tab=details`,
  );
  await expect(
    page.getByText(
      "Wait for provider confirmation. Manual refund completion is unavailable.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Request action", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Confirm update", exact: true }),
  ).toHaveCount(0);
  await noOverflow(page);
});
