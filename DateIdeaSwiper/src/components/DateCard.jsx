import { memo, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { CARD_HEIGHT, CARD_WIDTH } from "../constants/cardLayout";

const LOADING_OVERLAY_DELAY_MS = 120;

function DateCard({ item }) {
  const [imageLoading, setImageLoading] = useState(false);
  const loadingTimerRef = useRef(null);
  const cardId = item ? String(item.id) : "";

  useEffect(() => {
    setImageLoading(false);
    if (loadingTimerRef.current != null) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }, [cardId]);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current != null) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, []);

  if (!item) return null;

  const clearLoadingTimer = () => {
    if (loadingTimerRef.current != null) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  };

  const handleLoadStart = () => {
    clearLoadingTimer();
    loadingTimerRef.current = setTimeout(() => {
      setImageLoading(true);
    }, LOADING_OVERLAY_DELAY_MS);
  };

  const handleLoadEnd = () => {
    clearLoadingTimer();
    setImageLoading(false);
  };

  return (
    <View key={cardId} style={styles.card}>
      <View style={styles.imageWrap}>
        <Image
          key={cardId}
          recyclingKey={cardId}
          source={{ uri: item.image }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
          onLoadStart={handleLoadStart}
          onLoad={handleLoadEnd}
          onError={handleLoadEnd}
        />
        {imageLoading ? (
          <View pointerEvents="none" style={styles.imageLoadingOverlay}>
            <ActivityIndicator size="large" color="#e11d48" />
          </View>
        ) : null}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.chipRow}>
          {item.category ? (
            <View style={[styles.chip, styles.categoryChip]}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          ) : null}
          {item.vibes?.map((vibe, index) => (
            <View key={`${vibe}-${index}`} style={[styles.chip, styles.vibeChip]}>
              <Text style={styles.vibeText}>{vibe}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );
}

function areDateCardPropsEqual(prev, next) {
  return String(prev.item?.id) === String(next.item?.id);
}

export default memo(DateCard, areDateCardPropsEqual);

const IMAGE_HEIGHT = Math.round(CARD_HEIGHT * 0.62);

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: "#fff",
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  imageWrap: {
    width: "100%",
    height: IMAGE_HEIGHT,
    backgroundColor: "#f1f5f9",
  },
  image: {
    width: "100%",
    height: IMAGE_HEIGHT,
    backgroundColor: "#f1f5f9",
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(241, 245, 249, 0.55)",
  },
  content: {
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryChip: {
    backgroundColor: "#ffe4e6",
  },
  vibeChip: {
    backgroundColor: "#f1f5f9",
  },
  categoryText: {
    fontSize: 12,
    color: "#9f1239",
    fontWeight: "600",
  },
  vibeText: {
    fontSize: 12,
    color: "#475569",
  },
  description: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 20,
  },
});
