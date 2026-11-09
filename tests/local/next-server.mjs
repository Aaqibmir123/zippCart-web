import { spawn } from "node:child_process";
import cleanup from "./global-teardown.mjs";
const cli = new URL("../../node_modules/next/dist/bin/next", import.meta.url);
// This module lives in tests/local; resolve the installed CLI from the web root.
const { fileURLToPath } = await import("node:url");
const executable = fileURLToPath(cli);
let child;
const run = (args) =>
  new Promise((resolve, reject) => {
    child = spawn(process.execPath, [executable, ...args], {
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error("Owned Next.js process failed.")),
    );
  });
for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK"])
  process.once(signal, () => {
    child?.kill();
    process.exit(0);
  });
try {
  await run(["build", "--webpack"]);
  await run(["start", "--hostname", "127.0.0.1", "--port", "3200"]);
} catch (error) {
  await cleanup();
  throw error;
}
