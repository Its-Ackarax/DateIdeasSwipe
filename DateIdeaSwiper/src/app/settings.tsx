import * as Sentry from "@sentry/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { captureAppError } from "../lib/captureAppError";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { type Href, router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AuthGate from "../components/AuthGate";
import ConfirmDialog from "../components/ConfirmDialog";
import SettingsRow from "../components/SettingsRow";
import useAndroidNavigationBar from "../hooks/useAndroidNavigationBar";
import { clearOnboardingComplete } from "../lib/onboarding";
import { logOutRevenueCat } from "../lib/revenuecat";
import { supabase } from "../lib/supabase";

const PRIVACY_URL =
  "https://alder-roll-513.notion.site/Privacy-Policy-DateSwiper-dddf270e64b94b0fb4d17189a9720ec0?source=copy_link";

function deleteAccountRpcUserMessage(serverMessage: string): string {
  const m = serverMessage.toLowerCase();
  if (
    m.includes("could not find the function") ||
    m.includes("schema cache") ||
    m.includes("42883")
  ) {
    return [
      "The delete-account database function is not installed on your Supabase project yet.",
      "",
      "Fix: Supabase Dashboard → SQL → New query → paste the full contents of:",
      "supabase/migrations/20260515120000_delete_my_account.sql",
      "",
      "Run the query, then try Delete account again.",
    ].join("\n");
  }
  return serverMessage;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteFinalDialogVisible, setDeleteFinalDialogVisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  useAndroidNavigationBar({ backgroundColor: "#fff1f2", buttonStyle: "dark", position: "relative" });

  const openUrl = useCallback(async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert("Can't open link", "This link can't be opened on this device.");
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      captureAppError(error, { op: "settings_openUrl", screen: "settings" });
      Alert.alert("Can't open link", "Something went wrong opening that link.");
    }
  }, []);

  const confirmDeleteAccount = useCallback(() => {
    setDeleteFinalDialogVisible(false);
    setDeleteDialogVisible(true);
  }, []);

  const proceedToFinalDeleteConfirm = useCallback(() => {
    setDeleteDialogVisible(false);
    setDeleteFinalDialogVisible(true);
  }, []);

  const cancelDeleteFlow = useCallback(() => {
    setDeleteDialogVisible(false);
    setDeleteFinalDialogVisible(false);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        Alert.alert("Not signed in", "Sign in to delete your account.");
        cancelDeleteFlow();
        return;
      }

      const { error } = await supabase.rpc("delete_my_account");
      if (error) {
        captureAppError(error, { op: "delete_my_account", screen: "settings" });
        const raw = error.message || "Something went wrong. If this keeps happening, contact support.";
        Alert.alert("Could not delete account", deleteAccountRpcUserMessage(raw));
        return;
      }

      await AsyncStorage.removeItem("matchModalDisabled");
      await supabase.auth.signOut({ scope: "local" });
      try {
        await logOutRevenueCat();
      } catch (rcError) {
        captureAppError(rcError, { op: "deleteAccount_logOutRevenueCat", screen: "settings" });
      }
      await clearOnboardingComplete();
      cancelDeleteFlow();
      router.replace("/onboarding" as Href);
    } catch (err) {
      captureAppError(err, { op: "deleteAccount", screen: "settings" });
      Alert.alert("Could not delete account", "Something went wrong. Please try again.");
    } finally {
      setDeletingAccount(false);
    }
  }, [cancelDeleteFlow, deletingAccount]);

  return (
    <AuthGate>
    <LinearGradient colors={["#fb7185", "#fff1f2", "#fff1f2"]} style={styles.page}>
      <View style={styles.topGlow} />
      <View style={[styles.pageInner, { paddingTop: insets.top + 10 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Manage notifications, get help, and review legal information.
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 18) + 24 },
          ]}
        >
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Preferences</Text>
            <View style={styles.stack}>
              <SettingsRow
                title="Notifications"
                subtitle="Manage reminders and activity alerts"
                icon="notifications-outline"
                onPress={() =>
                  Alert.alert("Coming soon", "Notification settings will be available in a future update.")
                }
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Support</Text>
            <View style={styles.stack}>
              <SettingsRow
                title="FAQ / How It Works"
                subtitle="Learn how swiping, likes, and matches work"
                icon="help-circle-outline"
                onPress={() => router.push("/settings/faq")}
              />
              <SettingsRow
                title="Contact Support"
                subtitle="Fastest: X (@DeanRigneyDev)"
                icon="help-buoy-outline"
                onPress={() => router.push("/settings/support")}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Legal</Text>
            <View style={styles.stack}>
              <SettingsRow
                title="Privacy Policy"
                subtitle="External link"
                icon="document-text-outline"
                onPress={() => openUrl(PRIVACY_URL)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.stack}>
              <SettingsRow
                title="Delete Account"
                subtitle="Permanently remove your data and account"
                icon="trash-outline"
                danger
                onPress={confirmDeleteAccount}
              />
            </View>
          </View>

          {__DEV__ ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Developer</Text>
              <View style={styles.stack}>
                <SettingsRow
                  title="Try!"
                  subtitle="Send a test error to Sentry"
                  icon="bug-outline"
                  onPress={() => {
                    Sentry.captureException(new Error("First error"));
                  }}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Tip: You can also reach support from the Settings screen if you ever get locked out.
            </Text>
          </View>
        </ScrollView>
      </View>
      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete?"
        message="This permanently deletes your swipes, matches, and partner link, then removes your sign-in. This cannot be undone."
        cancelText="Cancel"
        confirmText="Delete"
        destructive
        onCancel={cancelDeleteFlow}
        onConfirm={proceedToFinalDeleteConfirm}
      />
      <ConfirmDialog
        visible={deleteFinalDialogVisible}
        title="Are you sure?"
        message="This is your last chance. Your account and all associated data will be permanently deleted."
        cancelText="Cancel"
        confirmText="Confirm Delete"
        destructive
        loading={deletingAccount}
        onCancel={cancelDeleteFlow}
        onConfirm={deleteAccount}
      />
    </LinearGradient>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    backgroundColor: "#fda4af",
    opacity: 0.22,
  },
  pageInner: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    maxWidth: 520,
  },
  scrollContent: {
    paddingTop: 8,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: "#64748b",
  },
  stack: {
    gap: 10,
  },
  footer: {
    paddingTop: 8,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748b",
  },
});

