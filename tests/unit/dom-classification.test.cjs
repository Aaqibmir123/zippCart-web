const test = require("node:test");
const assert = require("node:assert/strict");
const { loadDom } = require("./helpers/load-dom.cjs");
const elements = (t) =>
  Array.isArray(t)
    ? t.flatMap(elements)
    : t && typeof t === "object"
      ? [t, ...elements(t.props?.children)]
      : [];
const nodes = [
  { id: "fashion", name: "Fashion", parentId: null, legacyCategory: "Fashion" },
  {
    id: "women",
    name: "Women",
    parentId: "fashion",
    legacyCategory: "Fashion",
    customerPosition: 1,
  },
  { id: "shoes", name: "Shoes", parentId: "women", legacyCategory: "Fashion" },
  {
    id: "generic",
    name: "Shoes",
    parentId: "fashion",
    legacyCategory: "Fashion",
  },
];
function setup(save = async () => {}) {
  let cursor = 0;
  const slots = [],
    requests = [];
  let refreshes = 0,
    saved = 0;
  const react = {
    useState: (initial) => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [
        slots[i],
        (value) => {
          slots[i] = value;
        },
      ];
    },
    useRef: (initial) => {
      const i = cursor++;
      return (slots[i] ??= { current: initial });
    },
  };
  const real = loadDom()("features/admin/products/classification-api.ts");
  const { ClassificationEditor } = loadDom({
    react,
    "./classification-api": {
      ...real,
      classificationApi: {
        save: async (...args) => {
          requests.push(args);
          return save(...args);
        },
      },
    },
  })("features/admin/products/classification-editor.tsx");
  const props = {
    product: {
      id: "p",
      category: "Fashion",
      categoryId: "generic",
      description: "Audience unconfirmed",
      sizes: ["36", "UK 7"],
      originalCategory: "Other",
      customCategory: "Shoes",
      reason: "Pending",
      revision: 2,
    },
    nodes,
    disabled: false,
    refresh: async () => {
      refreshes++;
    },
    onSaved: async () => {
      saved++;
    },
    onCancel: () => {},
  };
  return {
    requests,
    props,
    get refreshes() {
      return refreshes;
    },
    get saved() {
      return saved;
    },
    render() {
      cursor = 0;
      return elements(ClassificationEditor(props));
    },
  };
}
const button = (tree) =>
  tree.find((n) => n.props.children === "Confirm classification");
function choose(app) {
  let tree = app.render();
  tree
    .find((n) => n.props.label === "Confirmed category")
    .props.onChange("shoes");
  tree = app.render();
  tree
    .find((n) => n.props.label === "Audience confirmation / evidence")
    .props.onChange("Seller confirmed women");
  tree = app.render();
  tree.find((n) => n.props.label?.startsWith("I confirm")).props.onChange(true);
  return app.render();
}

test("classification offers only real audience leaves; no inferred defaults or initial writes", () => {
  const app = setup(),
    tree = app.render();
  assert.equal(button(tree).props.disabled, true);
  assert.equal(app.requests.length, 0);
  const select = tree.find((n) => n.props.label === "Confirmed category");
  assert.equal(select.props.value, "");
  assert.deepEqual(
    select.props.options.map((x) => x.value),
    ["", "shoes"],
  );
  assert.ok(
    tree.some(
      (n) =>
        Array.isArray(n.props.children) &&
        n.props.children.includes("36, UK 7"),
    ),
  );
});

test("server-authorized production classification can explicitly place a legacy Other product in a confirmed audience", async () => {
  const app = setup();
  app.props.product.category = "Other";
  app.props.product.allowCatalogChange = true;
  const tree = choose(app);
  assert.equal(button(tree).props.disabled, false);
  await button(tree).props.onClick();
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0][1].categoryId, "shoes");
  assert.equal(app.requests[0][1].audienceConfirmed, true);
});
test("explicit confirmation saves one product with revision, blocks duplicate clicks and resets confirmation on category change", async () => {
  let resolve;
  const app = setup(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  let tree = choose(app);
  assert.equal(button(tree).props.disabled, false);
  button(tree).props.onClick();
  button(tree).props.onClick();
  assert.equal(app.requests.length, 1);
  assert.deepEqual(app.requests[0], [
    "p",
    {
      categoryId: "shoes",
      revision: 2,
      audienceConfirmed: true,
      reason: "Seller confirmed women",
    },
  ]);
  resolve();
  await new Promise(setImmediate);
  assert.equal(app.saved, 1);
  tree = app.render();
  tree.find((n) => n.props.label === "Confirmed category").props.onChange("");
  tree = app.render();
  assert.equal(button(tree).props.disabled, true);
  assert.equal(
    tree.find((n) => n.props.label?.startsWith("I confirm")).props.checked,
    false,
  );
});
test("stale edit refreshes without retrying the write; network failures remain visible", async () => {
  for (const error of [
    Object.assign(new Error("Refresh before saving"), {
      isApiError: true,
      status: 409,
    }),
    new Error("Network unavailable"),
  ]) {
    const app = setup(async () => {
      throw error;
    });
    button(choose(app)).props.onClick();
    await new Promise(setImmediate);
    assert.equal(app.saved, 0);
    assert.equal(app.requests.length, 1);
    assert.ok(
      app
        .render()
        .some((n) => n.props.error && n.props.children === error.message),
    );
    assert.equal(app.refreshes, error.status === 409 ? 1 : 0);
  }
});
test("classification transport preserves API filters, exact ID and PATCH body", async () => {
  const calls = [];
  const { classificationApi } = loadDom({
    "../../../lib/api/client": {
      apiRequest: (...args) => {
        calls.push(args);
        return Promise.resolve({});
      },
    },
  })("features/admin/products/classification-api.ts");
  await classificationApi.list("pending", 2);
  assert.equal(
    calls[0][0],
    "/admin/product-classifications?status=pending&page=2",
  );
  const payload = {
    categoryId: "leaf",
    revision: 4,
    audienceConfirmed: true,
    reason: "Verified",
  };
  await classificationApi.save("p", payload);
  assert.deepEqual(calls[1], [
    "/admin/product-classifications/p",
    { method: "PATCH", body: payload },
  ]);
});
