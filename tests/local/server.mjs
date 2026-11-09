// Test harness, not a backend feature. Imports the unchanged real application.
import { startRuntime, stopRuntime, mongoose } from "./runtime.mjs";
import http from "node:http";
import { timingSafeEqual } from "node:crypto";

let latestOtp = "";
let emailMessages = [];
// Console delivery is the existing local-only OTP mechanism. Capture in memory,
// never in browser responses, application logs, test reports, screenshots or traces.
const originalInfo = console.info;
console.info = (...values) => {
  const line = String(values[0] ?? "");
  const match = /^\[LOCAL OTP\] code: (\d{6}) /.exec(line);
  if (match) {
    latestOtp = match[1];
    return;
  }
  if (line.startsWith("[request]")) return;
  if (line.startsWith("Isolated acceptance")) originalInfo(...values);
};
console.log = () => {};
let backend;
let control;
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  for (const server of [control, backend])
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  await stopRuntime();
}
for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK"])
  process.once(signal, () => {
    void close().finally(() => process.exit(0));
  });
try {
  await startRuntime();
  const { createApp } = await import("../../../backend/src/app.js");
  const { seed, fixtureState } = await import("./seed.mjs");
  // Create application indexes only inside the owned test database.
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.createIndexes()),
  );
  await seed();
  backend = createApp({
    workspaceEmail: {
      assertAvailable() {},
      async send(message) {
        emailMessages.push(message);
      },
    },
  }).listen(4500, "127.0.0.1");
  await new Promise((resolve, reject) => {
    backend.once("listening", resolve);
    backend.once("error", reject);
  });
  control = http
    .createServer(async (request, response) => {
      if (request.url === "/health") {
        response.end("isolated");
        return;
      }
      const supplied = Buffer.from(request.headers.authorization ?? "");
      const expected = Buffer.from(
        `Bearer ${process.env.WEB_TEST_CONTROL_TOKEN}`,
      );
      if (
        supplied.length !== expected.length ||
        !timingSafeEqual(supplied, expected)
      ) {
        response.writeHead(403);
        response.end();
        return;
      }
      response.setHeader("Content-Type", "application/json");
      response.setHeader("Cache-Control", "no-store");
      try {
        if (request.url === "/state")
          response.end(JSON.stringify(fixtureState()));
        else if (request.url === "/otp")
          response.end(JSON.stringify({ code: latestOtp }));
        else if (request.url === "/email")
          response.end(
            JSON.stringify({
              message: emailMessages.at(-1) ?? null,
              count: emailMessages.length,
            }),
          );
        else if (request.url === "/shutdown" && request.method === "POST") {
          // Finish verified DB/filesystem cleanup before acknowledging. Windows
          // process-tree termination does not deliver Node's signal handlers.
          await stopRuntime();
          response.end(JSON.stringify({ stopped: true }));
          setImmediate(() => void close().finally(() => process.exit(0)));
        } else if (
          request.url?.split("?")[0] === "/reset" &&
          request.method === "POST"
        ) {
          latestOtp = "";
          emailMessages = [];
          const scenario = new URL(
            request.url,
            "http://127.0.0.1",
          ).searchParams.get("scenario");
          if (scenario && scenario !== "pagination")
            throw new Error("Unknown isolated fixture scenario.");
          response.end(
            JSON.stringify(
              await seed({ pagination: scenario === "pagination" }),
            ),
          );
        } else {
          response.writeHead(404);
          response.end("{}");
        }
      } catch (error) {
        response.writeHead(500);
        response.end(JSON.stringify({ message: "Fixture operation failed." }));
        console.error(
          "Isolated fixture operation failed:",
          error.name,
          error.message,
        );
      }
    })
    .listen(4501, "127.0.0.1");
  await new Promise((resolve, reject) => {
    control.once("listening", resolve);
    control.once("error", reject);
  });
  console.info(
    "Isolated acceptance backend ready. External providers disabled.",
  );
} catch (error) {
  console.error("Isolated acceptance setup failed:", error.name, error.message);
  await close();
  process.exitCode = 1;
}
