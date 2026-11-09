const test = require("node:test");
const assert = require("node:assert/strict");
const { loadDom } = require("./helpers/load-dom.cjs");
function setup(t, failure) {
  const counts = { requests: 0 };
  const oldDocument = global.document;
  global.document = { visibilityState: "visible" };
  t.after(() => {
    global.document = oldDocument;
  });
  let load;
  load = loadDom({
    "../api/client": {
      apiRequest: async (path, options) => {
        counts.requests++;
        assert.equal(path, "/media/products");
        assert.equal(options.imageBody.type, "image/png");
        assert.equal(options.timeoutMs, 60000);
        if (failure)
          throw load("lib/api/api-error.ts").createApiError(
            "Isolated upload failure",
            failure,
          );
        return { url: "https://res.cloudinary.com/isolated/image.jpg" };
      },
    },
  });
  const scope = load("lib/auth/session-scope.ts");
  scope.setSessionUser("isolated");
  return {
    counts,
    scope,
    image: load("lib/media/images.ts"),
    file: new File(["png"], "isolated.png", { type: "image/png" }),
  };
}
test("DOM photo upload preserves source format and sends one binary upload", async (t) => {
  const f = setup(t);
  assert.match(
    await f.image.uploadProductImage(f.file, f.scope.getSessionScope()),
    /^https:\/\/res.cloudinary.com\//,
  );
  assert.deepEqual(f.counts, { requests: 1 });
});
test("new web uploads never fall back to Base64 when binary storage is disabled", async (t) => {
  const f = setup(t, {
    kind: "http",
    status: 501,
    code: "IMAGE_UPLOADS_DISABLED",
  });
  await assert.rejects(
    f.image.uploadProductImage(f.file, f.scope.getSessionScope()),
  );
  assert.deepEqual(f.counts, { requests: 1 });
});
test("DOM upload failures never replay a potentially committed write", async (t) => {
  for (const failure of [
    { kind: "timeout" },
    { kind: "http", status: 502 },
    { kind: "http", status: 404 },
  ]) {
    const f = setup(t, failure);
    await assert.rejects(
      f.image.uploadProductImage(f.file, f.scope.getSessionScope()),
      (error) => error.kind === failure.kind,
    );
    assert.equal(f.counts.requests, 1);
    assert.equal(f.counts.requests, 1);
  }
});
test("DOM preparation rejects unsupported, empty and oversized images before upload", async (t) => {
  const f = setup(t);
  for (const file of [
    new File(["text"], "bad.txt", { type: "text/plain" }),
    new File([], "empty.jpg", { type: "image/jpeg" }),
    new File([new Uint8Array(11 * 1024 * 1024)], "big.jpg", {
      type: "image/jpeg",
    }),
  ])
    await assert.rejects(f.image.prepareImage(file));
  assert.deepEqual(f.counts, { requests: 0 });
});
