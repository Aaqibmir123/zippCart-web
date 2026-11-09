import {
  classifySessionFailure,
  createApiError,
  isApiError,
  type ApiErrorKind,
} from "./api-error";
import { responseError } from "./response-error";
import { foregroundRead } from "./foreground-request";
import { browserApiRoot } from "./config";
import { withBrowserLock } from "../auth/browser-lock";
import {
  assertCurrentSession,
  getSessionScope,
  isCurrentSession,
  type SessionScope,
} from "../auth/session-scope";
let apiUrl: string | undefined;
try {
  apiUrl = browserApiRoot(process.env.NEXT_PUBLIC_API_URL);
} catch {
  /* Report configuration failures before transport. */
}

type HttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
type RequestOptions = {
  body?: object;
  imageBody?: Blob;
  method?: HttpMethod;
  timeoutMs?: number;
  public?: boolean;
  skipAuthRefresh?: boolean;
  signal?: AbortSignal;
};
type AuthSessionHandler = {
  hasSession: () => boolean;
  refresh: () => Promise<unknown>;
  onInvalidSession: () => void;
  onRecoverableRefreshFailure: (kind: ApiErrorKind) => void;
};
let authSessionHandler: AuthSessionHandler | null = null;
let refreshInFlight: {
  session: SessionScope;
  promise: Promise<boolean>;
} | null = null;
let refreshRevision = 0;
let cookieRequests: Promise<unknown> = Promise.resolve();
let directRefresh: { session: SessionScope; promise: Promise<unknown> } | null =
  null;

export function registerAuthSessionHandler(
  handler: AuthSessionHandler,
): () => void {
  authSessionHandler = handler;
  return () => {
    if (authSessionHandler === handler) authSessionHandler = null;
  };
}

function logAuthEvent(event: string): void {
  console.info(`[auth] ${event}`);
}

function canRefresh(path: string, options: RequestOptions): boolean {
  return (
    !options.public &&
    !options.skipAuthRefresh &&
    !path.startsWith("/auth/otp/") &&
    path !== "/auth/refresh" &&
    path !== "/auth/logout"
  );
}

function refreshSession(session: SessionScope): Promise<boolean> {
  assertCurrentSession(session);
  if (refreshInFlight?.session === session) return refreshInFlight.promise;
  const handler = authSessionHandler;
  if (!handler?.hasSession()) return Promise.resolve(false);

  const promise = handler
    .refresh()
    .then(() => {
      if (!isCurrentSession(session)) return false;
      refreshRevision++;
      logAuthEvent("access_token_refreshed");
      return true;
    })
    .catch((error: unknown) => {
      if (!isCurrentSession(session)) return false;
      const failure = classifySessionFailure(error);
      logAuthEvent(failure.reason);
      if (failure.requiresLogin) {
        handler.onInvalidSession();
        return false;
      }
      if (failure.kind !== "cancelled")
        handler.onRecoverableRefreshFailure(failure.kind ?? "invalid_response");
      throw error;
    })
    .finally(() => {
      if (refreshInFlight?.promise === promise) refreshInFlight = null;
    });
  refreshInFlight = { session, promise };
  return promise;
}

function getEndpoint(path: string): string {
  const target = apiUrl;
  if (!target)
    throw createApiError(
      "Sign-in is unavailable. Please check the API configuration.",
      { kind: "configuration" },
    );
  if (target.startsWith("/")) return `${target}${path}`;
  let url: URL;
  try {
    url = new URL(target);
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Unsupported protocol");
  } catch {
    throw createApiError("The API configuration is invalid.", {
      kind: "configuration",
    });
  }
  // browserApiRoot permits HTTPS APIs and loopback-only HTTP development.
  return `${target}${path}`;
}

async function sendRequest<T>(
  path: string,
  options: RequestOptions,
  session?: SessionScope,
): Promise<T> {
  if (session) assertCurrentSession(session);
  assertNotCancelled(options.signal);
  const endpoint = getEndpoint(path);
  let body: string | Blob | undefined;
  try {
    if (options.body && options.imageBody)
      throw new Error("Conflicting request bodies");
    body =
      options.imageBody ??
      (options.body ? JSON.stringify(options.body) : undefined);
  } catch {
    throw createApiError(
      "The request could not be prepared. Please try again.",
      { kind: "invalid_request" },
    );
  }
  let response: Response;
  const controller = new AbortController();
  let abortKind: "timeout" | "cancelled" | undefined;
  const abort = (kind: "timeout" | "cancelled") => {
    if (abortKind) return;
    abortKind = kind;
    controller.abort();
  };
  const checkAbort = () => {
    if (abortKind)
      throw createApiError(
        abortKind === "timeout"
          ? "The request timed out. Please try again."
          : "Request cancelled.",
        { kind: abortKind },
      );
  };
  const timeout = setTimeout(
    () => abort("timeout"),
    options.timeoutMs ?? 10000,
  );
  const cancel = () => abort("cancelled");
  options.signal?.addEventListener("abort", cancel, { once: true });
  session?.signal.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();

  try {
    checkAbort();
    // Browser fetch carries HttpOnly cookies; JavaScript never reads tokens.
    const transport = fetch;
    checkAbort();
    if (session) assertCurrentSession(session);
    response = await transport(endpoint, {
      method: options.method ?? "POST",
      headers: {
        "Content-Type": options.imageBody
          ? options.imageBody.type
          : "application/json",
      },
      credentials: options.public ? "omit" : "include",
      signal: controller.signal,
      redirect: "error",
      body,
    });
    checkAbort();
    if (response.status === 204) return undefined as T;
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch (error) {
      checkAbort();
      // HTML/empty HTTP error bodies still have a meaningful HTTP status.
      if (!(error instanceof SyntaxError)) throw error;
      if (response.ok)
        throw createApiError(
          "The server returned an invalid response. Please try again later.",
          { kind: "invalid_response", status: response.status },
        );
    }
    checkAbort();
    if (response.ok) return parsed as T;
    const failure = responseError(response, parsed);
    throw failure;
  } catch (error) {
    checkAbort();
    if (isApiError(error)) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw createApiError("Request cancelled.", { kind: "cancelled" });
    }
    throw createApiError(
      typeof navigator !== "undefined" && navigator.onLine === false
        ? "You are offline. Reconnect and try again."
        : "Could not reach the server. Check the website address or try again shortly.",
      { kind: "network" },
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", cancel);
    session?.signal.removeEventListener("abort", cancel);
  }
}

function assertNotCancelled(signal?: AbortSignal): void {
  if (signal?.aborted)
    throw createApiError("Request cancelled.", { kind: "cancelled" });
}

async function request<T>(
  path: string,
  options: RequestOptions,
  session?: SessionScope,
): Promise<T> {
  const startedRevision = refreshRevision;
  try {
    const result = await sendRequest<T>(path, options, session);
    if (session) assertCurrentSession(session);
    return result;
  } catch (error) {
    if (session) assertCurrentSession(session);
    if (
      !isApiError(error) ||
      error.status !== 401 ||
      !canRefresh(path, options)
    )
      throw error;
    if (!session) throw error;
    assertNotCancelled(options.signal);
    try {
      const refreshed =
        startedRevision !== refreshRevision || (await refreshSession(session));
      assertCurrentSession(session);
      assertNotCancelled(options.signal);
      if (!refreshed) throw error;
      const result = await sendRequest<T>(
        path,
        { ...options, skipAuthRefresh: true },
        session,
      );
      assertCurrentSession(session);
      return result;
    } catch (refreshError) {
      assertCurrentSession(session);
      assertNotCancelled(options.signal);
      throw refreshError;
    }
  }
}

export function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const requestOptions = options;
  const session = options.public ? undefined : getSessionScope();
  if (
    ![
      "/auth/refresh",
      "/auth/logout",
      "/auth/otp/verify",
      "/auth/password/login",
      "/auth/password/change",
    ].includes(path)
  ) {
    if (options.method === "GET") {
      return foregroundRead(
        () => request<T>(path, requestOptions, session),
        options.signal,
        session?.signal,
      );
    }
    return request<T>(path, requestOptions, session);
  }
  if (
    path === "/auth/refresh" &&
    directRefresh &&
    directRefresh.session === session
  ) {
    return directRefresh.promise as Promise<T>;
  }
  // Cookie-changing responses must settle before another login/logout can begin.
  const promise = cookieRequests.then(() =>
    withBrowserLock("auth-cookies", () =>
      request<T>(path, requestOptions, session),
    ),
  );
  cookieRequests = promise.catch(() => undefined);
  if (path === "/auth/refresh" && session) {
    directRefresh = { session, promise };
    void promise
      .finally(() => {
        if (directRefresh?.promise === promise) directRefresh = null;
      })
      .catch(() => undefined);
  }
  return promise;
}
