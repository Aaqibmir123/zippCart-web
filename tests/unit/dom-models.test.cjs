const test = require("node:test");
const assert = require("node:assert/strict");
const { loadDom } = require("./helpers/load-dom.cjs");

function draft(overrides = {}) {
  return {
    fields: {
      name: "Test shirt",
      category: "Fashion",
      customCategory: "",
      description: "Cotton shirt",
      price: "500",
      mrp: "600",
      stock: "4",
      brand: "",
      sku: "",
    },
    sizes: [],
    colors: [],
    images: ["data:image/jpeg;base64,/9j/"],
    quantities: {},
    active: true,
    creationKey: "isolated-creation-key",
    ...overrides,
  };
}
test("product validation protects decimal money, unique variants and bounded stock/photos", () => {
  const model = loadDom()("features/seller/products/product-model.ts");
  const valid = draft();
  assert.equal(model.buildProduct(valid).creationKey, valid.creationKey);
  for (const fields of [
    { price: "1.001" },
    { price: "601" },
    { stock: "-1" },
    { stock: "1000001" },
    { category: "Other" },
    { sku: "bad/code" },
  ]) {
    assert.throws(() =>
      model.buildProduct(draft({ fields: { ...valid.fields, ...fields } })),
    );
  }
  assert.throws(() => model.buildProduct(draft({ sizes: ["M", "m"] })));
  assert.throws(() =>
    model.buildProduct(draft({ colors: [{ name: "Blue", images: [] }] })),
  );
  assert.throws(() =>
    model.buildProduct(draft({ images: Array(6).fill("photo") })),
  );
  assert.throws(() =>
    model.buildProduct(draft({ sizes: ["M"], quantities: {} })),
  );
  const row = model.variantKey("Blue", "M");
  const variants = model.buildProduct(
    draft({
      sizes: ["M"],
      colors: [{ name: "Blue", images: ["photo"] }],
      quantities: { [row]: "3" },
    }),
    { inventoryRevision: 8, submissionVersion: 6, variantStock: [] },
  );
  assert.equal(variants.stock, 3);
  assert.equal(variants.expectedInventoryRevision, 8);
  assert.equal(variants.expectedSubmissionVersion, 6);
  assert.equal(
    model.sizeGroups("kids").flatMap((group) => group.values).length,
    31,
  );
  assert.deepEqual(
    model.sizeGroups("footwear-uk")[0].values,
    Array.from({ length: 13 }, (_, index) => String(index + 1)),
  );
});
test("store registration revalidates conditional payout fields, documents and seller consent", () => {
  const { createForm, validateStep } = loadDom()(
    "features/seller/store/registration-model.ts",
  );
  const form = createForm();
  assert.ok(validateStep(form, 0).mobile);
  assert.ok(validateStep(form, 1).pincode);
  assert.equal(Object.keys(validateStep(form, 2)).length, 4);
  assert.ok(validateStep(form, 3).acceptedTerms);
  form.payoutMethod = "bank";
  form.accountNumber = "123";
  form.ifsc = "INVALID";
  assert.ok(validateStep(form, 3).accountNumber);
  assert.ok(validateStep(form, 3).ifsc);
  form.payoutMethod = "upi";
  form.upi = "invalid";
  assert.ok(validateStep(form, 3).upi);
});
test("session changes abort stale reads/uploads and a new login of the same identity gets a fresh generation", () => {
  const scope = loadDom()("lib/auth/session-scope.ts");
  const original = scope.setSessionUser("first");
  assert.equal(scope.setSessionUser("first"), original);
  const fresh = scope.setSessionUser("first", true);
  assert.notEqual(fresh, original);
  assert.equal(original.signal.aborted, true);
  assert.throws(() => scope.assertUserSession(original), { kind: "cancelled" });
  scope.setSessionUser(null);
  assert.throws(() => scope.assertUserSession(fresh), { kind: "cancelled" });
});
test("only a background-interrupted network/timeout read retries, once, after foreground", async () => {
  let state = "active";
  const listeners = new Set();
  const lifecycle = {
    get currentState() {
      return state;
    },
    addEventListener(_event, listener) {
      listeners.add(listener);
      return {
        remove() {
          listeners.delete(listener);
        },
      };
    },
  };
  const load = loadDom({
    "../browser-lifecycle": { browserLifecycle: lifecycle },
  });
  const { foregroundRead } = load("lib/api/foreground-request.ts");
  const { createApiError } = load("lib/api/api-error.ts");
  let calls = 0;
  const result = foregroundRead(async () => {
    calls++;
    if (calls === 1) {
      state = "background";
      listeners.forEach((listener) => listener(state));
      queueMicrotask(() => {
        state = "active";
        listeners.forEach((listener) => listener(state));
      });
      throw createApiError("Interrupted", { kind: "network" });
    }
    return "restored";
  });
  assert.equal(await result, "restored");
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(
    foregroundRead(async () => {
      calls++;
      throw createApiError("Server failure", { kind: "http", status: 502 });
    }),
  );
  assert.equal(calls, 1);
  assert.equal(listeners.size, 0);
});
test("owned order deep links use only Seller pagination and reject loops/foreign IDs", async () => {
  const calls = [];
  const own = "a".repeat(24);
  const foreign = "b".repeat(24);
  const load = loadDom({
    "./orders-api": {
      sellerOrderApi: {
        list: async (page, queue) => {
          calls.push([page, queue]);
          return {
            orders: page === 2 ? [{ id: own }] : [],
            nextPage: page === 1 ? 2 : null,
          };
        },
      },
    },
  });
  const { loadOwnedOrder } = load("features/seller/orders/owned-order.ts");
  assert.equal((await loadOwnedOrder(own)).id, own);
  assert.deepEqual(calls, [
    [1, "all"],
    [2, "all"],
  ]);
  await assert.rejects(loadOwnedOrder(foreign), /unavailable to your store/);
  const looping = loadDom({
    "./orders-api": {
      sellerOrderApi: { list: async () => ({ orders: [], nextPage: 1 }) },
    },
  })("features/seller/orders/owned-order.ts");
  await assert.rejects(looping.loadOwnedOrder(own), /invalid pagination/);
});
