import { test, expect } from "./test";
import { reset, workspaceLogin, api, noOverflow } from "./helpers";

test("Localhost login retains secure Seller cookies across requests", async ({
  page,
}) => {
  await reset(page.request);
  await page.goto("/login");
  await expect(page).toHaveURL("http://localhost:3200/login");
  await page
    .getByLabel("Mobile Number", { exact: true })
    .fill(process.env.WEB_TEST_SELLER_PHONE!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.WEB_TEST_SELLER_PASSWORD!);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3200/seller");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Isolated Fashion", exact: true }),
  ).toBeVisible();
  expect((await api(page, "/seller/session")).status()).toBe(200);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await api(page, "/auth/me")).status()).toBe(401);
});

test("Seller sidebar shows the live Store and a single settings entry with accessible mobile navigation", async ({
  page,
}, info) => {
  await reset(page.request);
  const modeRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/v1/auth/mode")
      modeRequests.push(request.method());
  });
  await workspaceLogin(page);
  const mobile = (page.viewportSize()?.width ?? 1280) < 1024;
  if (mobile)
    await page.getByRole("button", { name: "Open seller menu" }).click();
  const shell = mobile
    ? page.getByRole("dialog", { name: "Seller menu" })
    : page.getByRole("complementary", { name: "Seller sidebar" });
  await expect(
    shell.getByText("Isolated Fashion", { exact: true }),
  ).toBeVisible();
  await expect(
    shell.getByRole("link", { name: "Account settings", exact: true }),
  ).toHaveCount(1);
  await expect(
    shell.getByRole("link", { name: "Home", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: /Switch to Customer|Refresh data/ }),
  ).toHaveCount(0);
  await expect(page.getByText(/Native push is unavailable/)).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/visuals/${info.project.name}-seller-navigation.png`,
    fullPage: true,
  });
  if (mobile) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Seller menu" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Open seller menu" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Open seller menu" }).click();
  }
  await shell.getByRole("link", { name: "Orders", exact: true }).click();
  await expect(page).toHaveURL(/\/seller\/orders$/);
  if (mobile) {
    await expect(page.getByRole("dialog", { name: "Seller menu" })).toHaveCount(
      0,
    );
    await page.getByRole("button", { name: "Open seller menu" }).click();
  }
  await expect(
    shell.getByRole("link", { name: "Orders", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await shell
    .getByRole("link", { name: "Account settings", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Change password", exact: true }),
  ).toBeVisible();
  expect(modeRequests).toEqual([]);
  await noOverflow(page);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
