import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AuthGate from "../../components/AuthGate";
import ConfirmDialog from "../../components/ConfirmDialog";
import useAndroidNavigationBar from "../../hooks/useAndroidNavigationBar";
import { captureAppError } from "../../lib/captureAppError";

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
};

const SUPPORT_EMAIL = "hello@fondwellapp.com";
const SUPPORT_X_URL = "https://x.com/DeanRigneyDev";

type SupportTopic = "Account" | "Linking" | "Bug" | "Billing" | "Other";

const MESSAGE_PLACEHOLDER: Record<SupportTopic, string> = {
  Account:
    "E.g. can’t sign in, wrong email on file, or need help with your account - include the email you use and what happens when you try.",
  Linking:
    "E.g. invite code not working, partner already linked, or you need help unlinking - include both partners’ situations and any error text.",
  Bug:
    "E.g. what screen you’re on, what you tapped, what you expected vs what happened - steps to reproduce help a lot.",
  Billing:
    "E.g. subscription question, charge you don’t recognize, or restore purchases - say whether you’re on iOS or Android.",
  Other:
    "Describe what you need - the more detail (and any error messages), the faster we can help.",
};

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  useAndroidNavigationBar({ backgroundColor: "#fff1f2", buttonStyle: "dark", position: "relative" });
  const [message, setMessage] = useState("");
  const [topic, setTopic] = useState<SupportTopic>("Account");
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
  });

  const openAlert = useCallback((title: string, messageText: string) => {
    setAlertState({ visible: true, title, message: messageText });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState((s) => ({ ...s, visible: false }));
  }, []);

  const topicOptions = useMemo(
    () => [
      { key: "Account" as const, label: "Account access" },
      { key: "Linking" as const, label: "Linking partners" },
      { key: "Bug" as const, label: "Bug / Something broken" },
      { key: "Billing" as const, label: "Billing" },
      { key: "Other" as const, label: "Other" },
    ],
    []
  );

  const sendEmail = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      openAlert("Message required", "Write a short message so we know how to help.");
      return;
    }

    const subject = `Support request: ${topic}`;
    const body = `${trimmed}\n\n---\nApp: Fondwell\nPlatform: ${Platform.OS}`;
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    // Avoid canOpenURL(mailto) — it often returns false on Android/iOS even when a mail app exists.
    try {
      await Linking.openURL(mailto);
    } catch (error) {
      captureAppError(error, { op: "support_sendEmail", screen: "support" });
      try {
        await Clipboard.setStringAsync(
          `To: ${SUPPORT_EMAIL}\nSubject: ${subject}\n\n${body}`
        );
      } catch {
        /* ignore */
      }
      Alert.alert(
        "Couldn't open email",
        `Your draft was copied. Paste it into any email app, or write us at ${SUPPORT_EMAIL}.`
      );
    }
  }, [message, topic, openAlert]);

  const openSupportX = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      openAlert("Message required", "Write your message above first, then send on X.");
      return;
    }

    const payload = `Topic: ${topic}\n\n${trimmed}`;
    try {
      await Clipboard.setStringAsync(payload);
    } catch (error) {
      captureAppError(error, { op: "support_clipboard", screen: "support" });
      Alert.alert("Couldn't copy", "Copy your message manually, then DM @DeanRigneyDev on X.");
      return;
    }

    // Don't use canOpenURL for https:// — it often returns false on Android (queries intent)
    // and iOS (LSApplicationQueriesSchemes) even though the browser can open the link.
    try {
      await Linking.openURL(SUPPORT_X_URL);
    } catch (error) {
      captureAppError(error, { op: "support_openX", screen: "support" });
      Alert.alert("Can't open X", "Your message was copied. DM @DeanRigneyDev on X.");
    }
  }, [message, topic, openAlert]);

  return (
    <AuthGate>
    <LinearGradient colors={["#fb7185", "#fff1f2", "#fff1f2"]} style={styles.page}>
      <View style={styles.topGlow} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.pageInner, { paddingTop: insets.top + 10 }]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backRow, pressed && styles.backPressed]}
          hitSlop={12}
        >
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Contact Support</Text>
          <Text style={styles.subtitle}>
            Message us on X for the fastest response. For billing/subscriptions, email is best.
          </Text>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 18) + 24 },
          ]}
        >
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Topic</Text>
            <View style={styles.topicGrid}>
              {topicOptions.map((opt) => {
                const selected = opt.key === topic;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setTopic(opt.key)}
                    style={({ pressed }) => [
                      styles.topicPill,
                      selected && styles.topicPillSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.topicText, selected && styles.topicTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Message</Text>
            <View style={styles.inputCard}>
              <View style={styles.inputHeader}>
                <Ionicons name="chatbox-ellipses-outline" size={18} color="#334155" />
                <Text style={styles.inputHeaderText}>What can we help with?</Text>
              </View>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder={MESSAGE_PLACEHOLDER[topic]}
                placeholderTextColor="#94a3b8"
                multiline
                style={styles.input}
                textAlignVertical="top"
              />
              <View style={styles.sendRow}>
                <Pressable
                  onPress={openSupportX}
                  style={({ pressed }) => [
                    styles.sendButton,
                    styles.sendButtonMuted,
                    pressed && styles.sendButtonPressed,
                  ]}
                >
                  <Ionicons name="logo-twitter" size={16} color="#9f1239" style={styles.sendButtonIcon} />
                  <Text style={styles.sendButtonLabel} numberOfLines={1}>
                    Send on X
                  </Text>
                </Pressable>
                <Pressable
                  onPress={sendEmail}
                  style={({ pressed }) => [
                    styles.sendButton,
                    styles.sendButtonMuted,
                    pressed && styles.sendButtonPressed,
                  ]}
                >
                  <Ionicons name="mail-outline" size={16} color="#9f1239" style={styles.sendButtonIcon} />
                  <Text style={styles.sendButtonLabel} numberOfLines={1}>
                    Send via Email
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmDialog
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        confirmText="OK"
        hideCancel
        confirmPink
        onCancel={closeAlert}
        onConfirm={closeAlert}
      />
    </LinearGradient>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    backgroundColor: "#fda4af",
    opacity: 0.22,
  },
  pageInner: { flex: 1, paddingHorizontal: 20 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
    paddingVertical: 2,
    paddingRight: 12,
    marginBottom: 6,
  },
  backPressed: { opacity: 0.75 },
  backChevron: {
    fontSize: 28,
    fontWeight: "300",
    color: "#be123c",
    marginTop: -2,
  },
  backText: { fontSize: 16, fontWeight: "800", color: "#9f1239" },
  header: { paddingBottom: 12 },
  title: {
    fontSize: 26,
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
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: "#64748b",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  topicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  topicPill: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  topicPillSelected: {
    backgroundColor: "rgba(251, 55, 111, 0.92)",
    borderColor: "rgba(190, 18, 60, 0.35)",
  },
  topicText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  topicTextSelected: {
    color: "#ffffff",
  },
  inputCard: {
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    padding: 14,
    gap: 10,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputHeaderText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0f172a",
  },
  input: {
    minHeight: 120,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(248, 250, 252, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    color: "#0f172a",
    fontSize: 14,
    lineHeight: 20,
  },
  sendRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
    alignSelf: "center",
    maxWidth: 360,
    width: "100%",
    marginTop: 14,
  },
  sendButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 46,
  },
  sendButtonMuted: {
    backgroundColor: "rgba(255, 241, 242, 0.98)",
    borderColor: "rgba(251, 113, 133, 0.45)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sendButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  sendButtonIcon: { marginTop: 1 },
  sendButtonLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#9f1239",
    flexShrink: 1,
  },
});

