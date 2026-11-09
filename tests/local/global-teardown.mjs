// Only the authenticated, loopback fixture controller can stop its owned DB.
// This is test infrastructure, not an application/backend route.
export default async function globalTeardown() {
  let health;
  try {
    health = await fetch("http://127.0.0.1:4501/health", {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Setup never reached controller readiness, or already cleaned itself up.
    return;
  }
  if (!health.ok || (await health.text()) !== "isolated")
    throw new Error("Refusing teardown of an unrecognized local service.");
  const response = await fetch("http://127.0.0.1:4501/shutdown", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WEB_TEST_CONTROL_TOKEN}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok || (await response.json()).stopped !== true)
    throw new Error("Owned disposable database cleanup failed.");
}
