import { createApiError, parseFieldIssues } from "./api-error";

function retryAfterSeconds(value: string | null): number | undefined {
  if (!value?.trim()) return undefined;
  const seconds = /^\d+$/.test(value.trim())
    ? Number(value)
    : Math.ceil((Date.parse(value) - Date.now()) / 1000);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

export function responseError(response: Response, parsed: unknown) {
  const data =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as {
          message?: unknown;
          code?: unknown;
          issues?: unknown;
          formErrors?: unknown;
        })
      : {};
  const status = response.status;
  const issues = parseFieldIssues(data.issues) ?? {};
  const formErrors = parseFieldIssues({ formErrors: data.formErrors }) ?? {};
  for (const [field, messages] of Object.entries(formErrors)) {
    issues[field] = [...(issues[field] ?? []), ...messages].slice(0, 3);
  }
  const fallback =
    status === 401
      ? "Your session could not be verified. Please sign in again."
      : status === 403
        ? "You do not have permission to perform this action."
        : status === 429
          ? "Too many requests. Please wait and try again."
          : status >= 500
            ? "The server is unavailable. Please try again later."
            : "Request failed. Please try again.";
  return createApiError(
    typeof data.message === "string" && data.message.trim()
      ? data.message
      : fallback,
    {
      kind: status === 401 ? "unauthorized" : status >= 500 ? "server" : "http",
      status,
      code: typeof data.code === "string" ? data.code : undefined,
      issues: Object.keys(issues).length ? issues : undefined,
      retryAfterSeconds: retryAfterSeconds(response.headers.get("Retry-After")),
    },
  );
}
