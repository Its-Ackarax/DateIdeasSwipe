import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import {
  CARD_AREA_MARGIN_BOTTOM,
  CARD_HEIGHT,
  CARD_LEFT,
  CARD_TOP_OFFSET,
  CARD_WIDTH,
} from "../constants/cardLayout";

const GLOW_SCALE = 1.15;
const PEDESTAL_BACK_SCALE = 0.94;
const PEDESTAL_MID_SCALE = 0.97;
const PEDESTAL_BACK_OFFSET_Y = 20;
const PEDESTAL_MID_OFFSET_Y = 10;

export type SwipeStageBackgroundProps = {
  cardWidth?: number;
  cardHeight?: number;
  cardLeft?: number;
  cardTopOffset?: number;
  cardAreaMarginBottom?: number;
  /** Stack peek on swipe tab; use 0 when the card is a single filled surface (e.g. matches empty). */
  pedestalBackOffsetY?: number;
  pedestalMidOffsetY?: number;
  glowScale?: number;
  showBottomWash?: boolean;
  showPedestals?: boolean;
  showCenterGlow?: boolean;
};

export default function SwipeStageBackground({
  cardWidth = CARD_WIDTH,
  cardHeight = CARD_HEIGHT,
  cardLeft = CARD_LEFT,
  cardTopOffset = CARD_TOP_OFFSET,
  cardAreaMarginBottom = CARD_AREA_MARGIN_BOTTOM,
  pedestalBackOffsetY = PEDESTAL_BACK_OFFSET_Y,
  pedestalMidOffsetY = PEDESTAL_MID_OFFSET_Y,
  glowScale = GLOW_SCALE,
  showBottomWash = true,
  showPedestals = true,
  showCenterGlow = true,
}: SwipeStageBackgroundProps) {
  const glowWidth = cardWidth * glowScale;
  const glowHeight = cardHeight * glowScale;
  const glowLeft = cardLeft - (glowWidth - cardWidth) / 2;
  const glowTop = cardTopOffset - (glowHeight - cardHeight) / 2;

  const pedestalBackWidth = cardWidth * PEDESTAL_BACK_SCALE;
  const pedestalMidWidth = cardWidth * PEDESTAL_MID_SCALE;

  return (
    <View style={styles.stage} pointerEvents="none">
      {showBottomWash ? (
        <LinearGradient
          colors={["rgba(251, 113, 133, 0)", "rgba(251, 113, 133, 0.12)"]}
          locations={[0, 1]}
          style={styles.bottomWash}
        />
      ) : null}
      <View style={[styles.cardArea, { marginBottom: cardAreaMarginBottom }]}>
        {showCenterGlow ? (
          <View
            style={[
              styles.centerGlow,
              {
                width: glowWidth,
                height: glowHeight,
                left: glowLeft,
                top: glowTop,
              },
            ]}
          />
        ) : null}
        {showPedestals ? (
          <>
            <View
              style={[
                styles.pedestal,
                styles.pedestalBack,
                {
                  width: pedestalBackWidth,
                  height: cardHeight,
                  left: cardLeft + (cardWidth - pedestalBackWidth) / 2,
                  top: cardTopOffset + pedestalBackOffsetY,
                },
              ]}
            />
            <View
              style={[
                styles.pedestal,
                styles.pedestalMid,
                {
                  width: pedestalMidWidth,
                  height: cardHeight,
                  left: cardLeft + (cardWidth - pedestalMidWidth) / 2,
                  top: cardTopOffset + pedestalMidOffsetY,
                },
              ]}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    elevation: 0,
  },
  bottomWash: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 190,
  },
  cardArea: {
    flex: 1,
    width: "100%",
  },
  centerGlow: {
    position: "absolute",
    borderRadius: 32,
    backgroundColor: "rgba(255, 241, 242, 0.9)",
    shadowColor: "#fb7185",
    shadowOpacity: 0.35,
    shadowRadius: 48,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  pedestal: {
    position: "absolute",
    borderRadius: 28,
  },
  pedestalBack: {
    backgroundColor: "rgba(255, 228, 230, 0.55)",
  },
  pedestalMid: {
    backgroundColor: "rgba(254, 205, 211, 0.7)",
  },
});
