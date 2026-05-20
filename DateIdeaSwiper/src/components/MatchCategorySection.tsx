import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import type { CategoryVisual } from "../constants/categoryVisuals";
import type { DateIdea } from "../types/date";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GRID_GAP = 14;
const PAGE_PADDING = 20;
const CARD_WIDTH = Math.floor(
  (Dimensions.get("window").width - PAGE_PADDING * 2 - GRID_GAP) / 2
);

type MatchCategorySectionProps = {
  title: string;
  ideas: DateIdea[];
  visuals: CategoryVisual;
  expanded: boolean;
  compact?: boolean;
  showHint?: boolean;
  onToggle: () => void;
  onSelectIdea: (idea: DateIdea) => void;
};

function CardImageWithLoader({ uri }: { uri: string }) {
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.cardImageWrap}>
      <Image
        key={uri}
        source={{ uri }}
        style={styles.cardImage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setTimeout(() => setLoading(false), 0)}
        onError={() => setTimeout(() => setLoading(false), 0)}
      />
      {loading ? (
        <View pointerEvents="none" style={styles.cardImageLoadingOverlay}>
          <ActivityIndicator size="small" color="#e11d48" />
        </View>
      ) : null}
    </View>
  );
}

export default function MatchCategorySection({
  title,
  ideas,
  visuals,
  expanded,
  compact = false,
  showHint = true,
  onToggle,
  onSelectIdea,
}: MatchCategorySectionProps) {
  const indicatorOpacity = useRef(new Animated.Value(1)).current;
  const leftIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const layoutWidth = useRef(0);
  const contentWidth = useRef(0);

  const updateFadeOpacity = useCallback(
    (offsetX: number) => {
      const content = contentWidth.current;
      const layout = layoutWidth.current;

      if (!content || !layout) return;

      const maxScroll = Math.max(0, content - layout);
      if (maxScroll === 0) {
        indicatorOpacity.setValue(0);
        leftIndicatorOpacity.setValue(0);
        return;
      }

      const start = Math.max(0, maxScroll - CARD_WIDTH / 2);
      let opacity = 1;

      if (offsetX > start) {
        const progress = Math.min(
          1,
          (offsetX - start) / (maxScroll - start || 1)
        );
        opacity = 1 - progress;
      }

      indicatorOpacity.setValue(opacity);
      leftIndicatorOpacity.setValue(Math.min(1, offsetX / (CARD_WIDTH / 3)));
    },
    [indicatorOpacity, leftIndicatorOpacity]
  );

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  const countLabel =
    ideas.length === 1 ? "1 match" : `${ideas.length} matches`;

  return (
    <View style={[styles.section, compact && styles.sectionCompact]}>
      <Pressable
        style={({ pressed }) => [
          styles.headerRow,
          compact && styles.headerRowCompact,
          { borderLeftColor: visuals.accent },
          pressed && styles.headerRowPressed,
        ]}
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}, ${countLabel}, ${expanded ? "expanded" : "collapsed"}. Tap to ${expanded ? "hide" : "view"} matches.`}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.emoji}>{visuals.emoji}</Text>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, compact && styles.headerTitleCompact]}>
              {title}
            </Text>
            {!expanded && showHint ? (
              <Text style={styles.headerHint}>Tap to view matches</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.countPill,
              { backgroundColor: visuals.badgeBg, borderColor: visuals.accent },
            ]}
          >
            <Text style={[styles.countText, { color: visuals.badgeText }]}>
              {ideas.length}
            </Text>
          </View>
          <Text style={[styles.chevron, expanded && styles.chevronExpanded]}>
            ›
          </Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.rowWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            onLayout={(event) => {
              layoutWidth.current = event.nativeEvent.layout.width;
              updateFadeOpacity(0);
            }}
            onContentSizeChange={(width) => {
              contentWidth.current = width;
              updateFadeOpacity(0);
            }}
            onScroll={(event) => {
              updateFadeOpacity(event.nativeEvent.contentOffset.x);
            }}
            scrollEventThrottle={16}
          >
            {ideas.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => onSelectIdea(item)}
              >
                {item.image ? <CardImageWithLoader uri={item.image} /> : null}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.description ? (
                    <Text numberOfLines={2} style={styles.cardDescription}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[styles.cardAccent, { backgroundColor: visuals.accent }]}
                />
              </Pressable>
            ))}
          </ScrollView>
          {ideas.length > 2 ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={[styles.moreOverlay, { opacity: indicatorOpacity }]}
              >
                <LinearGradient
                  colors={[
                    "rgba(255, 241, 242, 0)",
                    "rgba(255, 241, 242, 0.9)",
                  ]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.moreFade}
                />
                <View style={styles.morePill}>
                  <Text style={styles.moreArrow}>›</Text>
                </View>
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[styles.moreOverlayLeft, { opacity: leftIndicatorOpacity }]}
              >
                <LinearGradient
                  colors={[
                    "rgba(255, 241, 242, 0.9)",
                    "rgba(255, 241, 242, 0)",
                  ]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.moreFadeLeft}
                />
                <View style={styles.morePillLeft}>
                  <Text style={styles.moreArrow}>‹</Text>
                </View>
              </Animated.View>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 14,
  },
  sectionCompact: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.14)",
    borderLeftWidth: 4,
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  headerRowCompact: {
    paddingVertical: 8,
  },
  headerRowPressed: {
    opacity: 0.92,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 6,
  },
  headerTextWrap: {
    flex: 1,
    gap: 1,
  },
  emoji: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
  },
  headerTitleCompact: {
    fontSize: 16,
  },
  headerHint: {
    fontSize: 11,
    lineHeight: 14,
    color: "#94a3b8",
    fontWeight: "500",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countPill: {
    minWidth: 26,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },
  chevron: {
    fontSize: 20,
    fontWeight: "700",
    color: "#94a3b8",
    transform: [{ rotate: "0deg" }],
  },
  chevronExpanded: {
    transform: [{ rotate: "90deg" }],
    color: "#be123c",
  },
  rowWrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    gap: GRID_GAP,
    paddingRight: 12,
  },
  moreFade: {
    position: "absolute",
    top: 0,
    right: -6,
    bottom: 0,
    width: 70,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  moreOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  moreOverlayLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  moreFadeLeft: {
    position: "absolute",
    top: 0,
    left: -6,
    bottom: 0,
    width: 70,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  morePillLeft: {
    position: "absolute",
    left: 6,
    top: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  morePill: {
    position: "absolute",
    right: 6,
    top: 12,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  moreArrow: {
    fontSize: 14,
    color: "#94a3b8",
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  cardImage: {
    width: "100%",
    height: CARD_WIDTH * 1.1,
    backgroundColor: "#f1f5f9",
  },
  cardImageWrap: {
    width: "100%",
    height: CARD_WIDTH * 1.1,
    backgroundColor: "#f1f5f9",
  },
  cardImageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(241, 245, 249, 0.5)",
    zIndex: 2,
  },
  cardBody: {
    padding: 12,
    gap: 6,
    flexGrow: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardDescription: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
  },
  cardAccent: {
    height: 4,
    marginTop: "auto",
  },
});
