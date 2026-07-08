import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { captureAppError } from "./captureAppError";
import { supabase } from "./supabase";

let currentPushToken: string | null = null;

export function configureForegroundNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function getNotificationPermissionStatus(): Promise<
  Notifications.PermissionStatus | "undetermined"
> {
  if (!Device.isDevice) return "undetermined";
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("matches", {
      name: "Matches",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    captureAppError(new Error("Missing EAS projectId for push token"), {
      op: "registerForPushNotifications",
    });
    return null;
  }

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    currentPushToken = tokenResult.data;
    return tokenResult.data;
  } catch (error) {
    captureAppError(error, { op: "registerForPushNotifications" });
    return null;
  }
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  const platform = Platform.OS === "ios" ? "ios" : "android";

  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      expo_push_token: token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,expo_push_token" }
  );

  if (error) {
    captureAppError(error, { op: "savePushToken", userId });
  }
}

export async function removePushToken(token?: string | null): Promise<void> {
  const resolved = token ?? currentPushToken;
  if (!resolved) return;

  const { error } = await supabase
    .from("push_tokens")
    .delete()
    .eq("expo_push_token", resolved);

  if (error) {
    captureAppError(error, { op: "removePushToken" });
  }

  if (resolved === currentPushToken) {
    currentPushToken = null;
  }
}

export async function syncPushTokenForUser(userId: string): Promise<void> {
  const token = await registerForPushNotifications();
  if (token) {
    await savePushToken(userId, token);
  }
}

export type MatchNotificationData = {
  screen?: string;
  dateId?: string;
};

export function getMatchNotificationRoute(
  data: MatchNotificationData | undefined
): "/(tabs)/matches" | null {
  if (data?.screen === "matches") {
    return "/(tabs)/matches";
  }
  return null;
}
