import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "onboardingComplete";

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "true";
  } catch {
    return false;
  }
}

export async function markOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, "true");
  } catch {
    /* ignore */
  }
}

/** TEMP: testing — clear so onboarding shows again after logout (revert later). */
export async function clearOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
