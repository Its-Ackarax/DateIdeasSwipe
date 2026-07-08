import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
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
import { getPostLoginRedirect } from "../../lib/authRedirect";
import { markOnboardingComplete } from "../../lib/onboarding";
import { supabase } from "../../lib/supabase";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function Login() {
  const { redirectTo } = useLocalSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetCooldown, setResetCooldown] = useState(0);
  const [emailFirstVisible, setEmailFirstVisible] = useState(false);
  const [loginErrorVisible, setLoginErrorVisible] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState("");
  const canSubmit = useMemo(
    () => Boolean(email.trim()) && Boolean(password) && !loginLoading,
    [email, password, loginLoading]
  );

  async function login() {
    if (loginLoading) return;
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const raw = (error.message || "").toLowerCase();
      const isInvalidCredentials =
        raw.includes("invalid login credentials") ||
        raw.includes("invalid email or password");
      setLoginErrorMessage(
        isInvalidCredentials
          ? "The email or password you entered is incorrect. Please double-check and try again."
          : error.message || "Something went wrong. Please try again."
      );
      setLoginErrorVisible(true);
      setLoginLoading(false);
      return;
    }

    await markOnboardingComplete();
    router.replace(getPostLoginRedirect(redirectTo));
    setLoginLoading(false);
  }

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCooldown]);

  function passwordResetErrorMessage(error) {
    const status = error?.status;
    const raw = (error?.message || "").toLowerCase();
    const isRateLimited =
      status === 429 ||
      raw.includes("rate limit") ||
      raw.includes("for security purposes") ||
      raw.includes("you can only request");
    if (isRateLimited) {
      const secondsMatch = raw.match(/after (\d+) seconds?/);
      const seconds = secondsMatch ? Number(secondsMatch[1]) : 60;
      return {
        seconds,
        text: "Too many reset requests. Please wait a moment and try again.",
      };
    }
    return {
      seconds: 0,
      text: error?.message || "Could not send reset link. Please try again.",
    };
  }

  async function sendPasswordReset() {
    if (!email) {
      setEmailFirstVisible(true);
      return;
    }
    if (resetSending || resetCooldown > 0) return;

    setResetSending(true);
    setResetMessage("");
    setResetError("");
    const owner = Constants.expoConfig?.owner;
    const slug = Constants.expoConfig?.slug;
    const redirectTo =
      owner && slug
        ? `https://auth.expo.dev/@${owner}/${slug}/auth/reset`
        : Linking.createURL("/auth/reset");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      const { seconds, text } = passwordResetErrorMessage(error);
      setResetError(text);
      if (seconds > 0) setResetCooldown(seconds);
    } else {
      setResetMessage("Check your email for a reset link.");
      setResetCooldown(60);
    }

    setResetSending(false);
  }

  return (
    <LinearGradient colors={["#fb7185", "#fff1f2", "#fff1f2"]} style={styles.page}>
      <View style={styles.topGlow} />
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
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to keep swiping, saving likes, and finding matches.
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
              editable={!loginLoading && !resetSending}
              returnKeyType="next"
            />

            <View style={{ height: 14 }} />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              editable={!loginLoading && !resetSending}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canSubmit) login();
              }}
            />

            <Pressable
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                canSubmit && styles.primaryButtonReady,
                (!canSubmit || loginLoading) && styles.primaryButtonDisabled,
                pressed && canSubmit && styles.buttonPressed,
              ]}
              onPress={login}
            >
              {loginLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={[styles.primaryButtonText, styles.primaryButtonTextActive]}>
                    Signing in…
                  </Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.primaryButtonText,
                    canSubmit && styles.primaryButtonTextActive,
                  ]}
                >
                  Log in
                </Text>
              )}
            </Pressable>

            <Pressable
              disabled={resetSending || loginLoading || resetCooldown > 0}
              onPress={sendPasswordReset}
              style={({ pressed }) => [
                styles.linkButton,
                pressed &&
                  !resetSending &&
                  !loginLoading &&
                  resetCooldown === 0 &&
                  styles.linkPressed,
              ]}
            >
              <Text
                style={[
                  styles.linkText,
                  resetCooldown > 0 && styles.linkTextDisabled,
                ]}
              >
                {resetSending
                  ? "Sending reset link..."
                  : resetCooldown > 0
                  ? `Try again in ${resetCooldown}s`
                  : "Forgot password?"}
              </Text>
            </Pressable>

            {resetMessage ? (
              <Text style={styles.successText}>{resetMessage}</Text>
            ) : null}

            {resetError ? (
              <Text style={styles.errorText}>{resetError}</Text>
            ) : null}

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
              onPress={() => router.push("/auth/signup")}
            >
              <Text style={styles.secondaryButtonText}>Create account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmDialog
        visible={emailFirstVisible}
        title="Email required"
        message="Enter your email first so we can send you a reset link."
        confirmText="OK"
        cancelText={null}
        confirmPink
        onCancel={() => setEmailFirstVisible(false)}
        onConfirm={() => setEmailFirstVisible(false)}
      />
      <ConfirmDialog
        visible={loginErrorVisible}
        title="Login failed"
        message={loginErrorMessage}
        confirmText="Try again"
        cancelText={null}
        confirmPink
        onCancel={() => setLoginErrorVisible(false)}
        onConfirm={() => setLoginErrorVisible(false)}
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
  pageInner: {
    flex: 1,
    padding: 20,
    paddingTop: 64,
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
    color: "#fda4af",
    fontWeight: "800",
    fontSize: 16,
  },
  primaryButtonTextActive: {
    color: "#ffffff",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  linkButton: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  linkText: {
    color: "#dc3848",
    fontWeight: "700",
  },
  linkTextDisabled: {
    color: "#94a3b8",
  },
  linkPressed: {
    opacity: 0.8,
  },
  successText: {
    marginTop: 10,
    color: "#15803d",
    textAlign: "center",
    fontWeight: "700",
  },
  errorText: {
    marginTop: 10,
    color: "#dc2626",
    textAlign: "center",
    fontWeight: "700",
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
    fontSize: 16,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});