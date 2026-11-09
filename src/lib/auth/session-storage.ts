import AsyncStorage from "./storage";

const onboardingKey = "zippcart.onboarding.seen.v1";
const logoutPendingKey = "zippcart.auth.logoutPending.v1";
const sessionMayExistKey = "zippcart.auth.sessionMayExist.v1";
const appStoragePrefix = "zippcart.";
export type SessionRestoreMode = "none" | "may-exist";

export const hasSeenOnboarding = async () =>
  (await AsyncStorage.getItem(onboardingKey)) === "true";
export const completeOnboarding = () =>
  AsyncStorage.setItem(onboardingKey, "true");
export const hasPendingLogout = async () =>
  (await AsyncStorage.getItem(logoutPendingKey)) === "true";
export const setPendingLogout = async () => {
  await AsyncStorage.setItem(logoutPendingKey, "true");
  await AsyncStorage.setItem(sessionMayExistKey, "no");
};
export const clearPendingLogout = () =>
  AsyncStorage.removeItem(logoutPendingKey);
export const markSessionMayExist = () =>
  AsyncStorage.setItem(sessionMayExistKey, "yes");
export const clearSessionMayExist = () =>
  AsyncStorage.setItem(sessionMayExistKey, "no");
export async function getSessionRestoreMode(): Promise<SessionRestoreMode> {
  if (await hasPendingLogout()) return "none";
  const marker = await AsyncStorage.getItem(sessionMayExistKey);
  if (marker === "yes") return "may-exist";
  if (marker === "no") return "none";
  const keys = await AsyncStorage.getAllKeys();
  const isLegacyInstall = keys.some(
    (key) => key.startsWith(appStoragePrefix) && key !== sessionMayExistKey,
  );
  if (isLegacyInstall) {
    await markSessionMayExist();
    return "may-exist";
  }
  await clearSessionMayExist();
  return "none";
}

// Remove retired device-only sessions on upgrade; never migrate them into real accounts.
export const clearRetiredSessions = () =>
  AsyncStorage.multiRemove([
    "zippcart.guest.active.v1",
    "zippcart.guest.data.v1",
    "zippcart.auth.environment.v1",
    "zippcart.auth.sessionMayExist.v1.demo",
    "zippcart.auth.logoutPending.v1.demo",
  ]);
