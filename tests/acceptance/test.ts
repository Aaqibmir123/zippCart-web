import { test as base, expect } from "@playwright/test";
export const test = base.extend<{ browserErrors: void }>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      const failures: string[] = [];
      page.on("requestfailed", (request) => {
        const url = new URL(request.url());
        failures.push(
          `${request.method()} ${url.pathname}: ${request.failure()?.errorText}`,
        );
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await use();
      expect(
        errors,
        `Uncaught browser errors, including hydration mismatches. Failed requests: ${failures.slice(-8).join("; ")}`,
      ).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
