import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RevenueCatUI from "react-native-purchases-ui";
import { captureAppError } from "../lib/captureAppError";
import { PRO_ENTITLEMENT_ID, REVENUECAT_PAYWALL_ENABLED } from "../lib/revenuecat";
import { usePro } from "../store/ProContext";

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { isPro } = usePro();
  const [presenting, setPresenting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const presentPaywall = useCallback(async () => {
    if (!REVENUECAT_PAYWALL_ENABLED) return;
    setPresenting(true);
    setErrorMessage(null);
    try {
      await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID,
      });
      if (router.canGoBack()) router.back();
    } catch (e: unknown) {
      captureAppError(e, { op: "presentPaywallIfNeeded", screen: "paywall" });
      setErrorMessage(
        e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
          ? String((e as { message: string }).message)
          : "Couldn't open the paywall."
      );
    } finally {
      setPresenting(false);
    }
  }, []);

  const openCustomerCenter = useCallback(async () => {
    if (!REVENUECAT_PAYWALL_ENABLED) return;
    setErrorMessage(null);
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (e: unknown) {
      captureAppError(e, { op: "presentCustomerCenter", screen: "paywall" });
      setErrorMessage(
        e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
          ? String((e as { message: string }).message)
          : "Couldn't open Customer Center."
      );
    }
  }, []);

  useEffect(() => {
    if (!REVENUECAT_PAYWALL_ENABLED) {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
      return;
    }
    if (isPro) {
      if (router.canGoBack()) router.back();
      return;
    }
    void presentPaywall();
  }, [isPro, presentPaywall]);

  return (
    <LinearGradient colors={["#fb7185", "#fff1f2", "#fff1f2"]} style={styles.page}>
      <View style={styles.topGlow} />
      <View
        style={[
          styles.inner,
          {
            paddingTop: insets.top + 14,
            paddingBottom: Math.max(insets.bottom, 18) + 18,
          },
        ]}
      >
        <Text style={styles.kicker}>DateSwiper Pro</Text>
        <Text style={styles.title}>Unlock unlimited swipes</Text>
        <Text style={styles.subtitle}>
          Upgrade to keep exploring date ideas and matching with your partner.
        </Text>

        <View style={{ height: 18 }} />

        <Pressable
          onPress={presentPaywall}
          disabled={presenting}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || presenting) && styles.pressed,
          ]}
        >
          {presenting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.primaryButtonText}>Opening…</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>View plans</Text>
          )}
        </Pressable>

        <Pressable
          onPress={openCustomerCenter}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>Manage subscription</Text>
        </Pressable>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <View style={{ flex: 1 }} />

        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
          <Text style={styles.linkText}>Not now</Text>
        </Pressable>
      </View>
    </LinearGradient>
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
  inner: {
    flex: 1,
    paddingHorizontal: 20,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: "#9f1239",
  },
  title: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    maxWidth: 520,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(251, 55, 111, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(190, 18, 60, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  secondaryButton: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "900",
    fontSize: 15,
  },
  linkButton: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  linkText: {
    color: "#9f1239",
    fontWeight: "900",
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  errorText: {
    marginTop: 12,
    color: "#b91c1c",
    fontWeight: "800",
  },
});

