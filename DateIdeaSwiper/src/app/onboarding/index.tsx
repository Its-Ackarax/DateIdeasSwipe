import { Outfit_800ExtraBold, useFonts } from "@expo-google-fonts/outfit";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { markOnboardingComplete } from "../../lib/onboarding";

const TOTAL_STEPS = 4;

const ACCENT = "#be123c";
const ACCENT_SAPPHIRE = "#1d4ed8";

function HeartPill({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.heartPill, compact && styles.heartPillCompact]}>
      <Text style={styles.heart}>❤</Text>
      <Text style={[styles.heartText, compact && styles.heartTextCompact]}>Date Idea Swiper</Text>
    </View>
  );
}

function IconBurst({
  children,
  size = 44,
}: {
  children: ReactNode;
  size?: number;
}) {
  const r = size / 2;
  return (
    <View style={[styles.iconBurstOuter, { width: size, height: size, borderRadius: r }]}>
      <LinearGradient
        colors={["#fda4af", "#f43f5e", "#be123c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.iconBurstFill, { width: size, height: size, borderRadius: r }]}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

function InsightLine({
  icon,
  children,
  iconSize = 44,
  iconGlyphSize = 21,
  spread,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  iconSize?: number;
  iconGlyphSize?: number;
  spread?: boolean;
}) {
  return (
    <View style={[styles.insightRow, spread && styles.insightRowSpread]}>
      <View style={styles.insightIconCell}>
        <IconBurst size={iconSize}>
          <Ionicons name={icon} size={iconGlyphSize} color="#ffffff" />
        </IconBurst>
      </View>
      <View style={styles.insightCopy}>{children}</View>
    </View>
  );
}

function FeatureBlock({
  icon,
  title,
  titleHighlight,
  titleRest,
  subtitle,
  sapphire,
  spread,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  titleHighlight: string;
  titleRest: string;
  subtitle: ReactNode;
  sapphire?: boolean;
  spread?: boolean;
}) {
  const titleHi = sapphire ? styles.featureTitleAccentSapphire : styles.featureTitleAccent;
  const burst = spread ? 44 : 52;
  const glyph = spread ? 22 : 26;
  return (
    <View style={[styles.featureBlock, spread && styles.featureBlockSpread]}>
      <View style={styles.featureIconCell}>
        <IconBurst size={burst}>
          <Ionicons name={icon} size={glyph} color="#ffffff" />
        </IconBurst>
      </View>
      <View style={[styles.featureCopy, spread && styles.featureCopySpread]}>
        <Text style={[styles.featureTitle, spread && styles.featureTitleSpread]}>
          {title}
          <Text style={titleHi}>{titleHighlight}</Text>
          {titleRest}
        </Text>
        {subtitle}
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [fontsLoaded] = useFonts({
    Outfit_800ExtraBold,
  });

  const goLogin = useCallback(async () => {
    await markOnboardingComplete();
    router.replace("/auth/login");
  }, []);

  const goSignup = useCallback(async () => {
    await markOnboardingComplete();
    router.replace("/auth/signup");
  }, []);

  const next = useCallback(() => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  }, [step]);

  const back = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const dots = useMemo(
    () =>
      Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, i === step ? styles.dotActive : styles.dotInactive]}
        />
      )),
    [step]
  );

  const titleFont = fontsLoaded ? { fontFamily: "Outfit_800ExtraBold" } : {};

  const scrollContentStyle = useMemo(() => {
    if (step === 0) {
      return [styles.scroll, styles.scrollCentered, { paddingTop: insets.top + 12 }];
    }
    if (step === 1 || step === 2) {
      return [styles.scrollSpread];
    }
    return [styles.scroll, styles.scrollCentered, { paddingTop: 4 }];
  }, [step, insets.top]);

  if (!fontsLoaded) {
    return (
      <LinearGradient colors={["#fb7185", "#fff1f2", "#fff1f2"]} style={styles.page}>
        <View style={[styles.fontBoot, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#fb7185", "#fff1f2", "#fff1f2"]} style={styles.page}>
      <View style={styles.topGlow} />
      <View style={[styles.safe, { paddingBottom: insets.bottom + 10 }]}>
        {step > 0 ? (
          <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
            <Pressable
              onPress={back}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={{ top: 14, bottom: 14, left: 10, right: 24 }}
              style={({ pressed }) => [styles.backBarBtn, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={24} color="#475569" />
              <Text style={styles.backTopText}>Back</Text>
            </Pressable>
          </View>
        ) : null}

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={scrollContentStyle}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 ? (
            <View style={styles.welcomeColumn}>
              <View style={styles.logoFrame}>
                <Image
                  source={require("../../../assets/images/icon.png")}
                  style={styles.logoImage}
                  contentFit="contain"
                  accessibilityLabel="App logo placeholder"
                />
              </View>
              <HeartPill />
              <Text style={[styles.headline, titleFont]}>Swipe your way to better dates</Text>
              <Text style={styles.lead}>
                Discover ideas <Text style={styles.accentBold}>you both love</Text>
                {"\n"}—then plan a night you will <Text style={styles.accentBold}>actually look forward to</Text>.
              </Text>
              <Pressable
                onPress={next}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              >
                <Text style={styles.primaryBtnText}>Get started</Text>
              </Pressable>
              <Pressable onPress={goLogin} style={({ pressed }) => [styles.textLinkWrap, pressed && styles.pressed]}>
                <Text style={styles.textLink}>I already have an account</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.spreadPage}>
              <View style={styles.spreadPageTop}>
                <HeartPill compact />
                <Text style={[styles.stepTitlePage2, styles.stepTitlePage2Spread, titleFont]}>
                  Importance of maintaining a strong romantic relationship
                </Text>
              </View>
              <View style={styles.spreadPageMiddle}>
                <View style={[styles.contentCard, styles.contentCardSpread]}>
                  <InsightLine spread icon="heart-outline" iconSize={38} iconGlyphSize={18}>
                    <Text style={styles.insightTextSpread}>
                      <Text style={styles.accentBold}>Strong bonds</Text>
                      {" often mean less "}
                      <Text style={styles.accentBold}>stress</Text>, better{" "}
                      <Text style={styles.accentBold}>sleep</Text>, and feeling like you truly{" "}
                      <Text style={styles.accentBold}>belong</Text>.
                      {"\n"}
                      <Text style={styles.mutedSoftSpread}>
                        Your relationship becomes a steady source of comfort—not another source of noise.
                      </Text>
                    </Text>
                  </InsightLine>
                  <View style={styles.cardDividerSpread} />
                  <InsightLine spread icon="sunny-outline" iconSize={38} iconGlyphSize={18}>
                    <Text style={styles.insightTextSpread}>
                      <Text style={styles.accentBold}>Tiny moments of warmth</Text>
                      {" stack up—daily "}
                      <Text style={styles.accentBold}>safety</Text>, <Text style={styles.accentBold}>appreciation</Text>,
                      and <Text style={styles.accentBold}>closeness</Text>.
                      {"\n"}
                      <Text style={styles.mutedSoftSpread}>
                        You do not need grand gestures every week—consistency wins.
                      </Text>
                    </Text>
                  </InsightLine>
                  <View style={styles.cardDividerSpread} />
                  <InsightLine spread icon="flame-outline" iconSize={38} iconGlyphSize={18}>
                    <Text style={styles.insightTextSpread}>
                      <Text style={styles.accentBold}>Fun dates</Text>
                      {" bring "}
                      <Text style={styles.accentBold}>curiosity</Text> and <Text style={styles.accentBold}>play</Text>
                      {" before you drift into "}
                      <Text style={styles.accentBold}>autopilot</Text>.
                      {"\n"}
                      <Text style={styles.mutedSoftSpread}>
                        Novelty keeps the spark from quietly fading into routine.
                      </Text>
                    </Text>
                  </InsightLine>
                </View>
              </View>
              <View style={styles.spreadPageBottom}>
                <Pressable
                  onPress={next}
                  style={({ pressed }) => [styles.primaryBtn, styles.primaryBtnSpread, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryBtnText}>Continue</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.spreadPage}>
              <View style={styles.spreadPageTop}>
                <HeartPill compact />
                <Text style={[styles.stepTitleCenter, styles.stepTitleCenterSpread, titleFont]}>
                  How we reignite the spark in your dating lives
                </Text>
              </View>
              <View style={styles.spreadPageMiddle}>
                <View style={[styles.contentCard, styles.contentCardSpread]}>
                  <FeatureBlock
                    spread
                    sapphire
                    icon="sparkles"
                    title=""
                    titleHighlight="250+"
                    titleRest=" date ideas"
                    subtitle={
                      <Text style={styles.featureSubtitleSpread}>
                        Browse <Text style={styles.inlineAccentRose}>indoor</Text>,{" "}
                        <Text style={styles.inlineAccentRose}>outdoor</Text>,{" "}
                        <Text style={styles.inlineAccentRose}>cozy</Text>,{" "}
                        <Text style={styles.inlineAccentRose}>adventurous</Text>—and everything between.
                      </Text>
                    }
                  />
                  <View style={styles.cardDividerSpread} />
                  <FeatureBlock
                    spread
                    sapphire
                    icon="heart"
                    title="Match with "
                    titleHighlight="your partner"
                    titleRest=""
                    subtitle={
                      <Text style={styles.featureSubtitleSpread}>
                        <Text style={styles.inlineAccentRose}>Swipe</Text> on{" "}
                        <Text style={styles.inlineAccentRose}>date ideas</Text> you each like—when you both pick the
                        same one, it is a <Text style={styles.inlineAccentRose}>match</Text> to plan from, without the
                        back-and-forth.
                      </Text>
                    }
                  />
                  <View style={styles.cardDividerSpread} />
                  <FeatureBlock
                    spread
                    sapphire
                    icon="albums-outline"
                    title=""
                    titleHighlight="Likes & matches"
                    titleRest=" in one place"
                    subtitle={
                      <Text style={styles.featureSubtitleSpread}>
                        Your next <Text style={styles.inlineAccentRose}>great night</Text> is always a tap away.
                      </Text>
                    }
                  />
                </View>
              </View>
              <View style={styles.spreadPageBottom}>
                <Pressable
                  onPress={next}
                  style={({ pressed }) => [styles.primaryBtn, styles.primaryBtnSpread, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryBtnText}>Continue</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.stepColumn}>
              <HeartPill />
              <Text style={[styles.stepTitleCenter, titleFont]}>Better dates, closer bond</Text>
              <View style={styles.contentCard}>
                <InsightLine icon="search-outline">
                  <Text style={styles.insightText}>
                    Ideas matched to <Text style={styles.accentBold}>mood</Text>,{" "}
                    <Text style={styles.accentBold}>budget</Text>, and <Text style={styles.accentBold}>time</Text>
                    {"—without the endless "}
                    <Text style={styles.accentBold}>“What should we do?”</Text> loop.
                    {"\n\n"}
                    <Text style={styles.mutedSoft}>Less guessing. More doing.</Text>
                  </Text>
                </InsightLine>
                <View style={styles.cardDivider} />
                <InsightLine icon="calendar-outline">
                  <Text style={styles.insightText}>
                    <Text style={styles.accentBold}>Intentional plans</Text>
                    {" beat last-minute "}
                    <Text style={styles.accentBold}>scrambles</Text>—and build{" "}
                    <Text style={styles.accentBold}>shared memories</Text> faster.
                    {"\n\n"}
                    <Text style={styles.mutedSoft}>When the plan feels considered, the night feels special.</Text>
                  </Text>
                </InsightLine>
                <View style={styles.cardDivider} />
                <InsightLine icon="infinite-outline">
                  <Text style={styles.insightText}>
                    <Text style={styles.accentBold}>Stronger, happier</Text> relationships—
                    <Text style={styles.accentBold}>one swipe</Text> at a time.
                  </Text>
                </InsightLine>
              </View>
              <Pressable
                onPress={goSignup}
                style={({ pressed }) => [styles.primaryBtn, styles.primaryBtnStep4, pressed && styles.pressed]}
              >
                <Text style={styles.primaryBtnText}>Improve my love life</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dotsRow}>{dots}</View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  fontBoot: { flex: 1, alignItems: "center", justifyContent: "center" },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    backgroundColor: "#fda4af",
    opacity: 0.2,
  },
  safe: { flex: 1 },
  topBar: {
    paddingLeft: 4,
    paddingRight: 12,
    paddingBottom: 8,
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
  scrollView: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  scrollCentered: {
    flexGrow: 1,
    justifyContent: "center",
  },
  scrollSpread: {
    paddingHorizontal: 25,
    paddingTop: 3,
    paddingBottom: 25,
  },
  spreadPage: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  spreadPageTop: {
    alignItems: "center",
    width: "100%",
    paddingBottom: 5,
  },
  spreadPageMiddle: {
    width: "100%",
    paddingVertical: 5,
  },
  spreadPageBottom: {
    width: "100%",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
  },
  welcomeColumn: {
    alignItems: "center",
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    paddingVertical: 12,
  },
  stepColumn: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    alignItems: "center",
    paddingVertical: 8,
    gap: 16,
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
    marginBottom: 2,
  },
  heartPillCompact: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    marginBottom: 0,
  },
  heart: {
    fontSize: 16,
    color: "#e11d48",
  },
  heartText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#be123c",
    textTransform: "uppercase",
  },
  heartTextCompact: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
  logoFrame: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  logoImage: { width: 82, height: 82 },
  headline: {
    fontSize: 30,
    color: "#0f172a",
    textAlign: "center",
    letterSpacing: -0.5,
    marginTop: 6,
    marginBottom: 8,
    lineHeight: 36,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
    textAlign: "center",
    maxWidth: 340,
    marginBottom: 20,
    fontWeight: "500",
  },
  accentBold: {
    color: ACCENT,
    fontWeight: "800",
  },
  inlineAccentRose: {
    color: "#e11d48",
    fontWeight: "700",
  },
  mutedSoft: {
    color: "#64748b",
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 20,
  },
  stepTitleCenter: {
    fontSize: 26,
    color: "#0f172a",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 32,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  stepTitleCenterSpread: {
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 3,
  },
  stepTitlePage2: {
    fontSize: 24,
    color: "#0f172a",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 30,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  stepTitlePage2Spread: {
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 3,
  },
  contentCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  contentCardSpread: {
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(148, 163, 184, 0.35)",
    marginVertical: 4,
    marginLeft: 58,
  },
  cardDividerSpread: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(148, 163, 184, 0.35)",
    marginVertical: 6,
    marginLeft: 62,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
  },
  insightRowSpread: {
    paddingVertical: 8,
    gap: 13,
  },
  insightIconCell: {
    paddingTop: 2,
  },
  iconBurstOuter: {
    shadowColor: "#be123c",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  iconBurstFill: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.95)",
  },
  insightCopy: { flex: 1 },
  insightTextSpread: {
    fontSize: 13,
    lineHeight: 23,
    fontWeight: "600",
    color: "#334155",
  },
  mutedSoftSpread: {
    color: "#64748b",
    fontWeight: "500",
    fontSize: 12,
    lineHeight: 20,
  },
  insightText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: "#334155",
  },
  featureBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
  },
  featureBlockSpread: {
    paddingVertical: 10,
    gap: 15,
  },
  featureIconCell: {
    paddingTop: 2,
  },
  featureCopy: { flex: 1, gap: 6 },
  featureCopySpread: { gap: 8 },
  featureTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  featureTitleSpread: {
    fontSize: 15,
    lineHeight: 25,
  },
  featureTitleAccent: {
    color: ACCENT,
    fontWeight: "800",
  },
  featureTitleAccentSapphire: {
    color: ACCENT_SAPPHIRE,
    fontWeight: "800",
  },
  featureSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#475569",
    fontWeight: "600",
  },
  featureSubtitleSpread: {
    fontSize: 12,
    lineHeight: 21,
    color: "#475569",
    fontWeight: "600",
  },
  primaryBtn: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "rgba(251, 55, 111, 0.92)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(190, 18, 60, 0.35)",
  },
  primaryBtnSpread: {
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnStep4: {
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16, textAlign: "center" },
  textLinkWrap: { marginTop: 14, alignSelf: "center", padding: 8 },
  textLink: { color: "#be123c", fontWeight: "700", fontSize: 15 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: "rgba(255, 241, 242, 0.72)",
  },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 999 },
  dotActive: { backgroundColor: "#e11d48", width: 22 },
  dotInactive: { backgroundColor: "rgba(148, 163, 184, 0.55)" },
});
