import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SettingsRow from "../../components/SettingsRow";
import useAndroidNavigationBar from "../../hooks/useAndroidNavigationBar";

export default function FAQScreen() {
  const insets = useSafeAreaInsets();
  useAndroidNavigationBar({ backgroundColor: "#fff1f2", buttonStyle: "dark", position: "relative" });

  const faqs = useMemo(
    () => [
      {
        q: "How does swiping work?",
        a: "Swipe right to like a date idea. Swipe left to pass. The 'Likes' tab keeps a list all dates that you liked.",
      },
      {
        q: "How do matches happen?",
        a: "When both partners like the same idea, it becomes a match and appears in the 'Matches' tab.",
      },
      {
        q: "Do I need to link accounts with a partner?",
        a: "Linking is recommended so you can easily see which dates are a true match. You can link or unlink any time from the 'Profile' tab.",
      },
      {
        q: "Can I reset my swipes?",
        a: "Yes. Profile → Reset Swipes clears your swipes and refreshes matches.",
      },
    ],
    []
  );

  return (
    <LinearGradient colors={["#fb7185", "#fff1f2", "#fff1f2"]} style={styles.page}>
      <View style={styles.topGlow} />
      <View style={[styles.pageInner, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backRow, pressed && styles.backPressed]}
          hitSlop={12}
        >
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>FAQ / How It Works</Text>
          <Text style={styles.subtitle}>
            A quick overview of the core flow. If something doesn’t look right, reach out to support.
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 18) + 24 },
          ]}
        >
          {faqs.map((item) => (
            <SettingsRow
              key={item.q}
              title={item.q}
              subtitle={item.a}
              icon="information-circle-outline"
              onPress={undefined}
              right={null}
            />
          ))}

          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Need help?</Text>
            <Text style={styles.ctaBody}>
              If you’re stuck, we can help troubleshoot account access, linking, and app issues.
            </Text>
            <SettingsRow
              title="Contact Support"
              subtitle="Send us a message"
              icon="mail-outline"
              onPress={() => router.push("/settings/support")}
            />
          </View>
        </ScrollView>
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
    gap: 10,
  },
  ctaCard: {
    marginTop: 10,
    paddingTop: 6,
    gap: 10,
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
  },
  ctaBody: {
    fontSize: 13,
    lineHeight: 18,
    color: "#475569",
  },
});

