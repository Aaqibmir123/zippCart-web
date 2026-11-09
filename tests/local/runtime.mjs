// An owned, disposable MongoDB process. Never reads backend.env or zippcart_local.
import "../../../backend/scripts/unit-environment.js";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

const requireBackend = createRequire(
  new URL("../../../backend/package.json", import.meta.url),
);
export const mongoose = requireBackend("mongoose");
const databaseName = `zippcart_web_phase2_${randomUUID().replaceAll("-", "")}`;
const port = 27139;
const replicaSet = "zippcartWebTest";
const standalone = process.env.WEB_TEST_MONGO_TOPOLOGY === "standalone";
const directory = await mkdtemp(path.join(tmpdir(), "zippcart-web-phase2-"));
const binary =
  process.env.WEB_TEST_MONGOD ??
  "C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe";
Object.assign(process.env, {
  DATABASE_ENVIRONMENT: "single",
  MONGODB_URI: `mongodb://127.0.0.1:${port}/${databaseName}${standalone ? "" : `?replicaSet=${replicaSet}`}`,
  CLIENT_ORIGIN: "http://127.0.0.1:3200,http://localhost:3200",
  ADMIN_PHONE: process.env.WEB_TEST_ADMIN_PHONE,
});
if (
  !process.env.WEB_TEST_CONTROL_TOKEN ||
  !process.env.WEB_TEST_ADMIN_PASSWORD ||
  !process.env.ADMIN_PHONE
) {
  throw new Error(
    "Start this harness with the Playwright configuration; ephemeral test credentials are required.",
  );
}
// Provider credentials were removed by the existing unit-environment bootstrap.
// Fail closed if any unexpected external network request escapes the test process.
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(
    typeof input === "string" || input instanceof URL ? input : input.url,
  );
  if (!["127.0.0.1", "localhost"].includes(url.hostname))
    throw new Error(
      "External network is disabled in the isolated acceptance backend.",
    );
  return originalFetch(input, init);
};

let child;
let stopping;
export async function stopRuntime() {
  stopping ??= (async () => {
    if (mongoose.connection.readyState === 1) {
      if (
        mongoose.connection.name !== databaseName ||
        !/^zippcart_web_phase2_[a-f0-9]{32}$/.test(databaseName)
      ) {
        throw new Error(
          "Refusing database cleanup outside the owned test database.",
        );
      }
      await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
    if (child && child.exitCode === null) {
      child.kill();
      await Promise.race([
        new Promise((resolve) => child.once("exit", resolve)),
        delay(10000),
      ]);
    }
    // Resolve and verify the exact owned directory before recursive cleanup.
    const target = path.resolve(directory);
    if (
      path.dirname(target) !== path.resolve(tmpdir()) ||
      !path.basename(target).startsWith("zippcart-web-phase2-")
    ) {
      throw new Error(
        "Refusing filesystem cleanup outside the owned test directory.",
      );
    }
    await rm(target, { recursive: true, force: true, maxRetries: 3 }).catch(
      () => undefined,
    );
  })();
  return stopping;
}
export async function startRuntime() {
  // Probe the fixed test port before spawning. Never attach to an existing server.
  const net = await import("node:net");
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", () =>
      reject(new Error("The isolated MongoDB test port is already occupied.")),
    );
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
  });
  child = spawn(
    binary,
    [
      "--dbpath",
      directory,
      "--port",
      String(port),
      "--bind_ip",
      "127.0.0.1",
      ...(standalone ? [] : ["--replSet", replicaSet]),
      "--logpath",
      path.join(directory, "mongo.log"),
    ],
    {
      stdio: "ignore",
      windowsHide: true,
    },
  );
  let spawnError;
  child.once("error", (error) => {
    spawnError = error;
  });
  const direct = new mongoose.mongo.MongoClient(
    `mongodb://127.0.0.1:${port}/?directConnection=true`,
    { serverSelectionTimeoutMS: 500 },
  );
  let connected = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (spawnError || child.exitCode !== null)
      throw new Error("Could not start the owned isolated MongoDB process.");
    try {
      await direct.connect();
      connected = true;
      break;
    } catch {
      await delay(250);
    }
  }
  if (!connected) throw new Error("Isolated MongoDB did not become available.");
  if (!standalone)
    await direct.db("admin").command({
      replSetInitiate: {
        _id: replicaSet,
        members: [{ _id: 0, host: `127.0.0.1:${port}` }],
      },
    });
  for (let attempt = 0; attempt < 80; attempt++) {
    if ((await direct.db("admin").command({ hello: 1 })).isWritablePrimary)
      break;
    await delay(250);
  }
  await direct.close();
  mongoose.set("autoIndex", false);
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
}
