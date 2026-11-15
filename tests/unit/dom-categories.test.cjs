const test = require("node:test");
const assert = require("node:assert/strict");
const { loadDom } = require("./helpers/load-dom.cjs");

const id = (number) => number.toString(16).padStart(24, "0");
const nodes = [
  {
    id: id(1),
    parentId: null,
    name: "Fashion",
    legacyCategory: "Fashion",
    position: 0,
  },
  {
    id: id(2),
    parentId: id(1),
    name: "Men",
    legacyCategory: "Fashion",
    position: 0,
  },
  {
    id: id(3),
    parentId: id(2),
    name: "Clothing",
    legacyCategory: "Fashion",
    position: 0,
  },
  {
    id: id(4),
    parentId: id(3),
    name: "Jackets",
    legacyCategory: "Fashion",
    position: 0,
  },
  {
    id: id(5),
    parentId: id(2),
    name: "Shoes",
    legacyCategory: "Fashion",
    position: 1,
  },
  {
    id: id(6),
    parentId: null,
    name: "Other",
    legacyCategory: "Other",
    position: 1,
  },
  {
    id: id(7),
    parentId: id(6),
    name: "Books",
    legacyCategory: "Other",
    position: 0,
  },
];
function elements(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(elements);
  return [tree, ...elements(tree.props?.children)];
}
function picker(query = {}) {
  const selected = [];
  const module = loadDom({
    "../lib/products/category-taxonomy": {
      categoryPath: loadDom()("lib/products/category-taxonomy.ts").categoryPath,
      useCategoryTaxonomy: () => ({ data: { categories: nodes }, ...query }),
    },
  })("features/seller/products/category-picker.tsx");
  return {
    selected,
    render: (category, value) =>
      elements(
        module.CategoryPicker({
          category,
          value,
          onChange: (value) => selected.push(value),
        }),
      ),
  };
}
function draft(fields = {}) {
  return {
    fields: {
      name: "Jacket",
      category: "Fashion",
      categoryId: "",
      customCategory: "",
      description: "Cotton jacket",
      price: "500",
      mrp: "600",
      stock: "4",
      brand: "",
      sku: "",
      ...fields,
    },
    sizes: [],
    colors: [],
    images: ["stored-photo"],
    quantities: {},
    active: true,
    creationKey: "creation-key",
  };
}

test("seller follows actual parent IDs through Men, Clothing and Jackets", () => {
  const form = picker();
  let controls = form
    .render("Fashion", "")
    .filter((item) => item.props.options);
  assert.deepEqual(
    controls[0].props.options.map((entry) => entry.value),
    ["", id(2)],
  );
  controls[0].props.onChange(id(2));
  controls = form
    .render("Fashion", form.selected.at(-1))
    .filter((item) => item.props.options);
  const men = controls.find((item) => item.props.label === "Men: product type");
  assert.deepEqual(
    men.props.options.map((entry) => entry.value),
    ["", id(3), id(5)],
  );
  men.props.onChange(id(3));
  controls = form
    .render("Fashion", form.selected.at(-1))
    .filter((item) => item.props.options);
  controls
    .find((item) => item.props.label === "Clothing: product type")
    .props.onChange(id(4));
  assert.equal(form.selected.at(-1), id(4));
  const { buildProduct } = loadDom()(
    "features/seller/products/product-model.ts",
  );
  assert.equal(
    buildProduct(draft({ categoryId: form.selected.at(-1) })).categoryId,
    id(4),
  );
});

test("Shoes and Other use real branches; clearing selection does not assign a parent", () => {
  const form = picker();
  const controls = form
    .render("Fashion", id(5))
    .filter((item) => item.props.options);
  assert.equal(controls.at(-1).props.value, id(5));
  controls.at(-1).props.onChange("");
  assert.equal(form.selected.at(-1), "");
  controls[0].props.onChange("");
  assert.equal(form.selected.at(-1), "");
  const other = form.render("Other", "").find((item) => item.props.options);
  assert.deepEqual(
    other.props.options.map((entry) => entry.value),
    ["", id(7)],
  );
});

test("legacy products omit categoryId, assigned edits preserve it, explicit removal sends null", () => {
  const { initialFields, buildProduct } = loadDom()(
    "features/seller/products/product-model.ts",
  );
  assert.equal(Object.hasOwn(buildProduct(draft()), "categoryId"), false);
  const original = {
    ...buildProduct(draft({ categoryId: id(4) })),
    id: id(20),
  };
  const fields = initialFields(original);
  assert.equal(fields.categoryId, id(4));
  assert.equal(buildProduct(draft(fields), original, nodes).categoryId, id(4));
  const legacyDraft = draft(fields);
  delete legacyDraft.fields.categoryId;
  delete legacyDraft.fields.categoryPlacement;
  assert.equal(buildProduct(legacyDraft, original).categoryId, id(4));
  legacyDraft.fields.category = "Watches";
  assert.equal(buildProduct(legacyDraft, original).categoryId, null);
  assert.equal(
    buildProduct(
      draft({
        ...fields,
        categoryId: "",
        categoryPlacement: "needs-classification",
      }),
      original,
      nodes,
    ).categoryId,
    null,
  );
  const other = buildProduct(
    draft({
      category: "Other",
      categoryId: id(7),
      customCategory: "  Books  ",
    }),
  );
  assert.equal(other.customCategory, "Books");
  assert.equal(other.categoryId, id(7));
  assert.throws(
    () => buildProduct(draft({ categoryId: "guessed-jackets" })),
    /valid product subcategory/,
  );
});

test("empty, unsupported and unavailable category data never clear a saved assignment", () => {
  for (const query of [
    { data: { categories: [], supported: true } },
    { data: { categories: [], supported: false } },
    { isError: true, error: new Error("Offline"), refetch() {} },
  ]) {
    const form = picker(query);
    assert.equal(
      form.render("Fashion", id(4)).some((item) => item.props.options),
      false,
    );
    assert.deepEqual(form.selected, []);
  }
});

test("taxonomy capability fallback is limited to recognized absent routes", async () => {
  const { createApiError } = loadDom()("lib/api/api-error.ts");
  const missing = [
    createApiError("Not found", { status: 404 }),
    createApiError("Invalid request.", {
      status: 400,
      issues: {
        request: ["Invalid string: must match pattern /^[a-fA-F0-9]{24}$/"],
      },
    }),
  ];
  for (const error of missing) {
    const module = loadDom({
      "@tanstack/react-query": { useQuery: (options) => options },
      "../api/client": {
        apiRequest: async () => {
          throw error;
        },
      },
    })("lib/products/category-taxonomy.ts");
    assert.deepEqual(await module.useCategoryTaxonomy().queryFn({}), {
      categories: [],
      supported: false,
    });
  }
  for (const error of [
    createApiError("Invalid request.", { status: 400 }),
    createApiError("Sign in", { status: 401 }),
    createApiError("Offline", { kind: "network" }),
    createApiError("Server error", { status: 503 }),
  ]) {
    const module = loadDom({
      "@tanstack/react-query": { useQuery: (options) => options },
      "../api/client": {
        apiRequest: async () => {
          throw error;
        },
      },
    })("lib/products/category-taxonomy.ts");
    await assert.rejects(module.useCategoryTaxonomy().queryFn({}), error);
  }
});

test("taxonomy request keeps its abort signal and rejects invalid API envelopes", async () => {
  const calls = [];
  let result = { categories: nodes };
  const module = loadDom({
    "@tanstack/react-query": { useQuery: (options) => options },
    "../api/client": {
      apiRequest: async (...args) => {
        calls.push(args);
        return result;
      },
    },
  })("lib/products/category-taxonomy.ts");
  const signal = new AbortController().signal;
  assert.deepEqual(await module.useCategoryTaxonomy().queryFn({ signal }), {
    categories: nodes,
    supported: true,
  });
  assert.deepEqual(calls[0], ["/products/taxonomy", { method: "GET", signal }]);
  result = { categories: null };
  await assert.rejects(module.useCategoryTaxonomy().queryFn({}), {
    kind: "invalid_response",
  });
  result = { categories: [null] };
  await assert.rejects(module.useCategoryTaxonomy().queryFn({}), {
    kind: "invalid_response",
  });
  assert.deepEqual(
    module.categoryPath(nodes, id(4)).map((node) => node.name),
    ["Fashion", "Men", "Clothing", "Jackets"],
  );
  assert.deepEqual(
    module.categoryPath([{ ...nodes[0], parentId: id(1) }], id(1)),
    [],
  );
});

test("changing the main seller category clears only the incompatible nested assignment", () => {
  let fields = draft({ categoryId: id(4), customCategory: "Handmade" }).fields;
  const module = loadDom({
    react: { ...require("react"), useState: () => [false, () => {}] },
    "../../auth/auth-provider": { useAuth: () => ({ user: { id: "seller" } }) },
    "../../../lib/hooks/use-url-state": {
      useUrlState: () => ({ get: () => "0" }),
    },
    "../../../components/product-preview": { ProductPreview() {} },
    "./product-photos": { ProductPhotos() {} },
    "./use-product-editor": {
      useProductEditor: () => ({
        fields,
        setFields: (update) => {
          fields = update(fields);
        },
        colors: [],
        sizes: [],
      }),
    },
  })("features/seller/products/product-form.tsx");
  const select = () =>
    elements(module.ProductForm({})).find(
      (item) => item.props.label === "Category",
    );
  select().props.onChange("Fashion");
  assert.equal(fields.categoryId, id(4));
  select().props.onChange("Other");
  assert.equal(fields.categoryId, "");
  fields.customCategory = "Handmade";
  select().props.onChange("Other");
  assert.equal(fields.customCategory, "Handmade");
  select().props.onChange("Watches");
  assert.equal(fields.customCategory, "");
});

test("admin and seller previews display the assigned API path", () => {
  const paths = loadDom()("lib/products/category-taxonomy.ts");
  const module = loadDom({
    react: { ...require("react"), useState: () => [null, () => {}] },
    "../lib/products/category-taxonomy": {
      categoryPath: paths.categoryPath,
      useCategoryTaxonomy: () => ({ data: { categories: nodes } }),
    },
  })("components/product-preview.tsx");
  const { buildProduct } = loadDom()(
    "features/seller/products/product-model.ts",
  );
  const tree = module.ProductPreview({
    title: "Submission",
    product: buildProduct(draft({ categoryId: id(4) })),
  });
  const details = elements(tree).find((item) => item.props.values);
  assert.equal(
    details.props.values.Subcategory,
    "Fashion / Men / Clothing / Jackets",
  );
});
