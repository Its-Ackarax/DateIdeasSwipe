import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

const CARD_WIDTH_RATIO = 0.92;
const CARD_AREA_HEIGHT_RATIO = 0.99;
const CARD_MIN_HEIGHT = 240;
const CARD_MAX_HEIGHT = 560;
const CARD_VERTICAL_RESERVE = 2;
const CARD_CTA_GAP = 28;
const CTA_BOTTOM_GAP = 0;
const COMPACT_WINDOW_HEIGHT = 680;
/** Rough space for header, gaps, CTA, and tab bar when cardArea is not measured yet. */
const FALLBACK_CHROME_HEIGHT = 320;

type MatchesEmptyStateProps = {
  onStartSwiping: () => void;
  contentPaddingHorizontal?: number;
  style?: StyleProp<ViewStyle>;
};

function computeCardHeight(cardAreaHeight: number) {
  if (cardAreaHeight <= 0) {
    return CARD_MIN_HEIGHT;
  }
  const usable = Math.max(0, cardAreaHeight - CARD_VERTICAL_RESERVE);
  return Math.min(
    CARD_MAX_HEIGHT,
    Math.max(CARD_MIN_HEIGHT, Math.floor(usable * CARD_AREA_HEIGHT_RATIO))
  );
}

export default function MatchesEmptyState({
  onStartSwiping,
  contentPaddingHorizontal = 20,
  style,
}: MatchesEmptyStateProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [cardAreaHeight, setCardAreaHeight] = useState(0);

  const contentWidth = windowWidth - contentPaddingHorizontal * 2;
  const cardWidth = Math.round(contentWidth * CARD_WIDTH_RATIO);

  const cardHeight = useMemo(() => {
    if (cardAreaHeight > 0) {
      return computeCardHeight(cardAreaHeight);
    }
    const fallbackCardArea = Math.max(
      CARD_MIN_HEIGHT,
      windowHeight - FALLBACK_CHROME_HEIGHT
    );
    return computeCardHeight(fallbackCardArea);
  }, [cardAreaHeight, windowHeight]);

  const isCompact = windowHeight < COMPACT_WINDOW_HEIGHT;

  const onCardAreaLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      const next = event.nativeEvent.layout.height;
      setCardAreaHeight((prev) => (prev === next ? prev : next));
    },
    []
  );

  return (
    <View style={[styles.body, style]}>
      <View style={styles.cardArea} onLayout={onCardAreaLayout}>
        <View
          style={[
            styles.placeholderCard,
            { width: cardWidth, height: cardHeight },
          ]}
        >
          <View style={[styles.iconWrap, isCompact && styles.iconWrapCompact]}>
            <Text style={[styles.icon, isCompact && styles.iconCompact]}>✨</Text>
          </View>
          <Text style={[styles.headline, isCompact && styles.headlineCompact]}>
            No matches yet
          </Text>
          <Text
            style={[styles.bodyText, isCompact && styles.bodyTextCompact]}
            numberOfLines={5}
          >
            When you and your partner both swipe right on the same idea, it shows up here.
          </Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        onPress={onStartSwiping}
      >
        <Text style={styles.ctaText}>Start swiping</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    minHeight: 0,
  },
  cardArea: {
    flex: 1,
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: CARD_CTA_GAP,
  },
  placeholderCard: {
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(244, 63, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconWrapCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 10,
  },
  icon: {
    fontSize: 24,
  },
  iconCompact: {
    fontSize: 20,
  },
  headline: {
    alignSelf: "stretch",
    width: "100%",
    fontSize: 20,
    fontWeight: "800",
    color: "#7f1d1d",
    textAlign: "center",
    marginBottom: 8,
  },
  headlineCompact: {
    fontSize: 17,
    marginBottom: 6,
  },
  bodyText: {
    alignSelf: "stretch",
    width: "100%",
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    textAlign: "center",
  },
  bodyTextCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
  cta: {
    alignSelf: "stretch",
    marginTop: "auto",
    marginBottom: CTA_BOTTOM_GAP,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "rgba(251, 55, 111, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(190, 18, 60, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
});
