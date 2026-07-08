import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { markOnboardingComplete } from "../../lib/onboarding";
import { supabase } from "../../lib/supabase";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function Signup() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(
    () =>
      Boolean(email.trim()) &&
      Boolean(password) &&
      password.length >= 6 &&
      !signupLoading,
    [email, password, signupLoading]
  );

  async function signUp() {
    if (!canSubmit) return;
    setSignupLoading(true);
    setErrorMessage("");
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setSignupLoading(false);

    if (error) {
      setErrorMessage(error.message);
      setErrorVisible(true);
      return;
    }

    await markOnboardingComplete();
    setSuccessVisible(true);
  }

  function goToLogin() {
    setSuccessVisible(false);
    router.replace("/auth/login");
  }

  function goBackFromSignup() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/onboarding");
    }
  }

  async function goToLoginFromSignup() {
    await markOnboardingComplete();
    router.replace("/auth/login");
  }

  return (
    <LinearGradient colors={["#fb7185", "#fff1f2", "#fff1f2"]} style={styles.page}>
      <View style={styles.topGlow} />
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={goBackFromSignup}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 14, bottom: 14, left: 10, right: 24 }}
          style={({ pressed }) => [styles.backBarBtn, pressed && styles.buttonPressed]}
        >
          <Ionicons name="chevron-back" size={24} color="#475569" />
          <Text style={styles.backTopText}>Back</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.pageInner}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heartPill}>
              <Image
                source={require("../../../assets/images/icon.png")}
                style={styles.brandIcon}
                contentFit="contain"
                accessibilityLabel="Fondwell"
              />
              <Text style={styles.heartText}>Fondwell</Text>
            </View>
            <Text style={styles.title}>Create an account</Text>
            <Text style={styles.subtitle}>
              Date ideas, together.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              editable={!signupLoading}
              returnKeyType="next"
            />

            <View style={{ height: 14 }} />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
              placeholder="Enter a password"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              editable={!signupLoading}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canSubmit) signUp();
              }}
            />

            <Text style={styles.hint}>
              Use at least 6 characters for your password.
            </Text>

            <Pressable
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                canSubmit && styles.primaryButtonReady,
                (!canSubmit || signupLoading) && styles.primaryButtonDisabled,
                pressed && canSubmit && styles.buttonPressed,
              ]}
              onPress={signUp}
            >
              {signupLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.primaryButtonText}>Creating account…</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Create account</Text>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={goToLoginFromSignup}
            >
              <Text style={styles.secondaryButtonText}>Already have an account? Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={successVisible}
        title="Check your email"
        message="We sent you a confirmation link. Open it to finish setting up your account, then you can log in."
        confirmText="OK"
        cancelText={null}
        confirmPink
        onCancel={goToLogin}
        onConfirm={goToLogin}
      />

      <ConfirmDialog
        visible={errorVisible}
        title="Could not sign up"
        message={errorMessage || "Something went wrong. Please try again."}
        confirmText="OK"
        cancelText={null}
        onCancel={() => setErrorVisible(false)}
        onConfirm={() => setErrorVisible(false)}
      />
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
    opacity: 0.2,
  },
  topBar: {
    paddingLeft: 4,
    paddingRight: 12,
    paddingBottom: 4,
  },
  backBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 44,
  },
  backTopText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#475569",
    marginLeft: -2,
  },
  pageInner: {
    flex: 1,
    padding: 20,
    paddingTop: 8,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 24,
  },
  hero: {
    alignItems: "center",
    marginBottom: 18,
  },
  heartPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.2)",
    marginBottom: 14,
  },
  brandIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  heartText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#be123c",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    textAlign: "center",
    maxWidth: 340,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0f172a",
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: "#64748b",
  },
  primaryButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(251, 164, 189, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(251, 164, 189, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    opacity: 0.8,
  },
  primaryButtonReady: {
    backgroundColor: "rgba(251, 55, 111, 0.91)",
    borderColor: "rgba(190, 18, 60, 0.35)",
    opacity: 1,
  },
  primaryButtonDisabled: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: "rgb(255, 255, 255)",
    fontWeight: "800",
    fontSize: 16,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerRow: {
    marginTop: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.35)",
  },
  dividerText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "800",
    fontSize: 15,
    textAlign: "center",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
