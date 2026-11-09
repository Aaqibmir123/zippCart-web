export type ApiErrorKind =
  | "network"
  | "timeout"
  | "server"
  | "unauthorized"
  | "http"
  | "cancelled"
  | "invalid_response"
  | "invalid_request"
  | "configuration";
export type ApiError = Error & {
  isApiError: true;
  kind?: ApiErrorKind;
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
  issues?: Record<string, string[]>;
};

export function createApiError(
  message: string,
  metadata: {
    kind?: ApiErrorKind;
    status?: number;
    code?: string;
    retryAfterSeconds?: number;
    issues?: Record<string, string[]>;
  } = {},
): ApiError {
  return Object.assign(
    new Error(message),
    { isApiError: true as const },
    metadata,
  );
}

export function parseFieldIssues(
  value: unknown,
): Record<string, string[]> | undefined {
  const parsed: Record<string, string[]> = {};
  const clean = (message: unknown) =>
    typeof message === "string"
      ? message
          .replace(/[\u0000-\u001f\u007f]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 240)
      : "";
  const add = (field: string, message: unknown) => {
    const value = clean(message);
    if (!value) return;
    const key = field.trim().slice(0, 80) || "request";
    const messages = parsed[key] ?? (parsed[key] = []);
    if (messages.length < 3 && !messages.includes(value)) messages.push(value);
  };
  const isRecord = (input: unknown): input is Record<string, unknown> =>
    !!input && typeof input === "object" && !Array.isArray(input);

  const read = (input: unknown, field = "request") => {
    if (Array.isArray(input)) {
      for (const item of input) {
        if (typeof item === "string") add(field, item);
        else if (isRecord(item)) {
          const path = Array.isArray(item.path)
            ? item.path
                .filter(
                  (part) =>
                    typeof part === "string" || typeof part === "number",
                )
                .join(".")
            : "";
          add(path || field, item.message);
        }
      }
      return;
    }
    if (!isRecord(input)) return;
    if ("fieldErrors" in input || "formErrors" in input) {
      read(input.fieldErrors);
      read(input.formErrors, "request");
      return;
    }
    for (const [key, messages] of Object.entries(input)) {
      if (Array.isArray(messages)) read(messages, key);
      else if (typeof messages === "string") add(key, messages);
    }
  };

  read(value);
  return Object.keys(parsed).length ? parsed : undefined;
}

export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof Error && "isApiError" in error && error.isApiError === true
  );
}

export function isConfirmedSessionFailure(error: unknown): error is ApiError {
  return isApiError(error) && error.status === 401;
}

export type SessionFailure = {
  requiresLogin: boolean;
  reason:
    | "refresh_invalid"
    | "refresh_expired"
    | "refresh_revoked"
    | "refresh_network_error"
    | "refresh_timeout"
    | "refresh_server_error"
    | "refresh_cancelled"
    | "refresh_response_error"
    | "refresh_http_error"
    | "refresh_client_error";
  kind?: ApiErrorKind;
};

export function classifySessionFailure(error: unknown): SessionFailure {
  if (isConfirmedSessionFailure(error)) {
    const reason =
      error.code === "SESSION_REVOKED"
        ? "refresh_revoked"
        : error.code === "REFRESH_EXPIRED"
          ? "refresh_expired"
          : "refresh_invalid";
    return { requiresLogin: true, reason };
  }
  const kind = isApiError(error) ? error.kind : undefined;
  return {
    requiresLogin: false,
    reason:
      kind === "timeout"
        ? "refresh_timeout"
        : kind === "server"
          ? "refresh_server_error"
          : kind === "network"
            ? "refresh_network_error"
            : kind === "cancelled"
              ? "refresh_cancelled"
              : kind === "invalid_response"
                ? "refresh_response_error"
                : kind === "http"
                  ? "refresh_http_error"
                  : "refresh_client_error",
    kind,
  };
}
