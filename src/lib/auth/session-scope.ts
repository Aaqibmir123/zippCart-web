import { createApiError } from "../api/api-error";

export type SessionScope = Readonly<{
  userId: string | null;
  generation: number;
  signal: AbortSignal;
}>;

let controller = new AbortController();
let current: SessionScope = {
  userId: null,
  generation: 0,
  signal: controller.signal,
};

export const getSessionScope = () => current;
export const isCurrentSession = (
  session: SessionScope | null,
): session is SessionScope =>
  !!session && session === current && !session.signal.aborted;

export function setSessionUser(
  userId: string | null,
  newLogin = false,
): SessionScope {
  if (current.userId === userId && !newLogin) return current;
  const previous = controller;
  controller = new AbortController();
  current = {
    userId,
    generation: current.generation + 1,
    signal: controller.signal,
  };
  // Publish the new identity before abort handlers can run callbacks.
  previous.abort();
  return current;
}

export function assertCurrentSession(
  session: SessionScope | null,
): asserts session is SessionScope {
  if (!isCurrentSession(session)) {
    throw createApiError("Your session changed. Please try again.", {
      kind: "cancelled",
    });
  }
}

export function assertUserSession(
  session: SessionScope | null,
): asserts session is SessionScope {
  assertCurrentSession(session);
  if (!session.userId)
    throw createApiError("Please sign in to continue.", { kind: "cancelled" });
}
