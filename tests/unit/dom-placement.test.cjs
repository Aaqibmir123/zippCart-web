const test = require("node:test");
const assert = require("node:assert/strict");
const { loadDom } = require("./helpers/load-dom.cjs");
function hookHarness() {
  const values = [];
  let cursor = 0;
  return {
    react: {
      useState(initial) {
        const slot = cursor++;
        if (!(slot in values))
          values[slot] = typeof initial === "function" ? initial() : initial;
        return [
          values[slot],
          (value) => {
            values[slot] =
              typeof value === "function" ? value(values[slot]) : value;
          },
        ];
      },
      useRef(initial) {
        const slot = cursor++;
        return (values[slot] ??= { current: initial });
      },
    },
    render(fn) {
      cursor = 0;
      return fn();
    },
  };
}
const elements = (tree) =>
  Array.isArray(tree)
    ? tree.flatMap(elements)
    : tree && typeof tree === "object"
      ? [tree, ...elements(tree.props?.children)]
      : [];
const id = (n) => n.toString(16).padStart(24, "0");
const nodes = [
  { id: id(1), name: "Fashion", parentId: null, legacyCategory: "Fashion" },
  {
    id: id(2),
    name: "Men",
    parentId: id(1),
    legacyCategory: "Fashion",
    customerPosition: 0,
  },
  { id: id(3), name: "Clothing", parentId: id(2), legacyCategory: "Fashion" },
  { id: id(4), name: "Jackets", parentId: id(3), legacyCategory: "Fashion" },
];
const categoryPath = loadDom()(
  "lib/products/category-taxonomy.ts",
).categoryPath;
const taxonomy = {
  categoryPath,
  useCategoryTaxonomy: () => ({ data: { categories: nodes } }),
};
function draft(categoryId, categoryPlacement) {
  return {
    fields: {
      name: "Girls Kids Jacket",
      category: "Fashion",
      categoryId,
      categoryPlacement,
      customCategory: "",
      description: "Do not infer audience",
      price: "100",
      mrp: "150",
      stock: "2",
      brand: "",
      sku: "",
    },
    sizes: [],
    images: ["stored-original"],
    colors: [],
    quantities: {},
    active: true,
    creationKey: "test-key",
  };
}

test("web submissions require real final placement and send unknown classification explicitly", () => {
  const { buildProduct } = loadDom({ "./category-taxonomy": taxonomy })(
    "features/seller/products/product-model.ts",
  );
  assert.throws(
    () => buildProduct(draft(id(2), "confirmed"), undefined, nodes),
    /leaf category/,
  );
  assert.throws(
    () => buildProduct(draft("", "confirmed"), undefined, nodes),
    /final product category/,
  );
  assert.throws(
    () => buildProduct(draft(id(4), "needs-classification"), undefined, nodes),
    /Clear the nested/,
  );
  const saved = buildProduct(draft(id(4), "confirmed"), undefined, nodes);
  assert.equal(saved.categoryId, id(4));
  assert.equal(saved.categoryPlacement, "confirmed");
  assert.equal(saved.name, "Girls Kids Jacket");
  assert.deepEqual(saved.images, ["stored-original"]);
  assert.equal(saved.price, 100);
  assert.equal(saved.stock, 2);
  const unknown = buildProduct(
    draft("", "needs-classification"),
    undefined,
    [],
  );
  assert.equal(unknown.categoryPlacement, "needs-classification");
  assert.ok(!unknown.categoryId);
});

test("web admin corrections require a leaf and confirmation, then invalidate confirmation on changes", () => {
  const hooks = hookHarness(),
    changes = [];
  const { ApprovalPlacement } = loadDom({
    react: { ...require("react"), ...hooks.react },
    "../../../lib/products/category-taxonomy": taxonomy,
    "./category-taxonomy": taxonomy,
    "../../../components/product-placement-fields": {
      PlacementFields: "PlacementFields",
    },
  })("features/admin/products/approval-placement.tsx");
  const product = {
    category: "Watches",
    categoryId: null,
    customCategory: "",
    images: ["original"],
    price: 99,
  };
  const before = JSON.stringify(product);
  const render = () =>
    elements(
      hooks.render(() =>
        ApprovalPlacement({
          product,
          onChange: (value) => changes.push(value),
          disabled: false,
        }),
      ),
    );
  render()
    .find((n) => n.props.label === "Placement catalog")
    .props.onChange("Fashion");
  render()
    .find((n) => n.type === "PlacementFields")
    .props.onChange(id(2), "confirmed");
  render()
    .find((n) => n.props["aria-label"] === "Confirm customer placement")
    .props.onChange();
  assert.equal(changes.at(-1), undefined);
  render()
    .find((n) => n.type === "PlacementFields")
    .props.onChange(id(4), "confirmed");
  render()
    .find((n) => n.props["aria-label"] === "Confirm customer placement")
    .props.onChange();
  assert.deepEqual(changes.at(-1), {
    category: "Fashion",
    categoryId: id(4),
    categoryPlacement: "confirmed",
    customCategory: "",
    confirmed: true,
  });
  render()
    .find((n) => n.type === "PlacementFields")
    .props.onChange("", "needs-classification");
  assert.equal(changes.at(-1), undefined);
  assert.equal(JSON.stringify(product), before);
});

test("web approval sends only the displayed confirmed placement and prevents duplicate decisions", async () => {
  const hooks = hookHarness(),
    calls = [];
  const product = {
    id: id(30),
    submissionVersion: 3,
    moderationStatus: "pending",
    submitted: { category: "Fashion" },
    inventoryChanged: false,
  };
  const { ProductDetail } = loadDom({
    react: { ...require("react"), ...hooks.react },
    "../../auth/auth-provider": { useAuth: () => ({ user: { id: "admin" } }) },
    "./approval-placement": { ApprovalPlacement: "Placement" },
    "./products-api": {
      productReviewApi: { review: async (...args) => calls.push(args) },
    },
    "@tanstack/react-query": {
      useQuery: () => ({ data: { product } }),
      useQueryClient: () => ({ invalidateQueries: async () => {} }),
    },
  })("features/admin/products/product-detail.tsx");
  const render = () =>
    elements(hooks.render(() => ProductDetail({ id: product.id })));
  const approve = () =>
    render().find((n) => n.props.children === "Approve reviewed version");
  approve().props.onClick();
  assert.equal(calls.length, 0);
  const placement = {
    category: "Fashion",
    categoryId: id(4),
    categoryPlacement: "confirmed",
    customCategory: "",
    confirmed: true,
  };
  render()
    .find((n) => n.type === "Placement")
    .props.onChange(placement);
  const button = approve();
  button.props.onClick();
  button.props.onClick();
  await new Promise(setImmediate);
  assert.deepEqual(calls, [[product.id, 3, "approved", "", placement]]);
});
