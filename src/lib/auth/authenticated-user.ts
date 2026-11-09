import type { AuthenticatedUser } from "../api/auth-api";

// Account fields are scalar except roles, whose order does not change permissions.
export function sameAuthenticatedUser(
  current: AuthenticatedUser,
  next: AuthenticatedUser,
): boolean {
  const keys = new Set([
    ...Object.keys(current),
    ...Object.keys(next),
  ] as (keyof AuthenticatedUser)[]);
  for (const key of keys) {
    if (key === "roles") {
      const previous = current.roles ?? [];
      const incoming = next.roles ?? [];
      if (
        previous.length !== incoming.length ||
        !previous.every((role) => incoming.includes(role))
      )
        return false;
    } else if (current[key] !== next[key]) return false;
  }
  return true;
}
