import { classifySessionFailure } from "../api/api-error";

export type StartupRestoreOutcome = "login" | "app" | "retry";

export function startupRestoreOutcome(
  succeeded: boolean,
  error?: unknown,
): StartupRestoreOutcome {
  if (succeeded) return "app";
  return classifySessionFailure(error).requiresLogin ? "login" : "retry";
}
