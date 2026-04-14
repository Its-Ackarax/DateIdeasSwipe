import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useCallback } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SettingsRow from "../components/SettingsRow";

const PRIVACY_URL = "https://example.com/privacy-policy";
const TERMS_URL = "https://example.com/terms-of-service";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const openUrl = useCallback(async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert("Can't open link", "This link can't be opened on this device.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Can't open link", "Something went wrong opening that link.");
    }
  }, []);

  const confirmDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete account?",
      "To delete your account please contact support.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "OK", style: "default" },
      ],
      { cancelable: true }
    );
  }, []);

  return (
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
                subtitle="Fastest: X (@DeanRigneyDev). Fallback: email."
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
              <SettingsRow
                title="Terms of Service"
                subtitle="External link"
                icon="shield-checkmark-outline"
                onPress={() => openUrl(TERMS_URL)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.stack}>
              <SettingsRow
                title="Delete Account"
                subtitle="Requires support confirmation"
                icon="trash-outline"
                danger
                onPress={confirmDeleteAccount}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Tip: You can also reach support from the Settings screen if you ever get locked out.
            </Text>
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
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

