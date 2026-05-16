import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";
import Swiper from "react-native-deck-swiper";
import DateCard from "./DateCard";
import type { DateIdea } from "../types/date";

const CARD_WIDTH = Math.round(Dimensions.get("window").width * 0.88);

export type SwipeDeckHandle = {
  resetTopCard: () => void;
  showFeedback: (type: "like" | "pass") => Promise<void>;
};

type SwipeDeckProps = {
  deckDates: DateIdea[];
  swiperKey: number;
  onSwipedRight: (index: number) => void;
  onSwipedLeft: (index: number) => void;
};

const SwipeDeck = forwardRef<SwipeDeckHandle, SwipeDeckProps>(function SwipeDeck(
  { deckDates, swiperKey, onSwipedRight, onSwipedLeft },
  ref
) {
  const swiperRef = useRef<InstanceType<typeof Swiper> | null>(null);
  const feedbackLikeOpacity = useRef(new Animated.Value(0)).current;
  const feedbackPassOpacity = useRef(new Animated.Value(0)).current;

  const resetTopCard = useCallback(() => {
    const swiper = swiperRef.current as { resetPanAndScale?: () => void } | null;
    swiper?.resetPanAndScale?.();
  }, []);

  const showFeedback = useCallback(
    (type: "like" | "pass") => {
      const active = type === "like" ? feedbackLikeOpacity : feedbackPassOpacity;
      const idle = type === "like" ? feedbackPassOpacity : feedbackLikeOpacity;
      idle.setValue(0);
      active.setValue(0);
      return new Promise<void>((resolve) => {
        Animated.sequence([
          Animated.timing(active, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.delay(220),
          Animated.timing(active, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) resolve();
        });
      });
    },
    [feedbackLikeOpacity, feedbackPassOpacity]
  );

  useImperativeHandle(ref, () => ({ resetTopCard, showFeedback }), [
    resetTopCard,
    showFeedback,
  ]);

  const cards = useMemo(
    () => deckDates.filter((card): card is DateIdea => card != null && card.id != null),
    [deckDates]
  );

  const stackSize = Math.min(3, Math.max(1, cards.length));

  const renderCard = useCallback(
    (card: DateIdea | undefined) =>
      card ? (
        <View style={styles.cardShell} collapsable={false}>
          <DateCard item={card} />
        </View>
      ) : null,
    []
  );

  const keyExtractor = useCallback((card: DateIdea | undefined) => {
    if (card?.id != null) return String(card.id);
    return "deck-slot-empty";
  }, []);

  if (cards.length === 0) {
    return <View style={styles.swiperDeck} collapsable={false} />;
  }

  return (
    <View style={styles.swiperDeck} collapsable={false}>
      <Swiper
        ref={swiperRef}
        key={`swiper-${swiperKey}`}
        cards={cards}
        keyExtractor={keyExtractor}
        renderCard={renderCard}
        onSwipedRight={onSwipedRight}
        onSwipedLeft={onSwipedLeft}
        stackSize={stackSize}
        stackScale={0}
        stackSeparation={8}
        backgroundColor="transparent"
        cardVerticalMargin={12}
        cardHorizontalMargin={0}
        cardStyle={styles.cardStyle}
      />
      <View pointerEvents="none" style={styles.swipeFeedbackLayer}>
        <Animated.View
          style={[
            styles.swipeFeedback,
            styles.swipeFeedbackLike,
            { opacity: feedbackLikeOpacity },
          ]}
        >
          <Text style={[styles.swipeFeedbackText, styles.swipeFeedbackTextLike]}>✔</Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.swipeFeedback,
            styles.swipeFeedbackPass,
            { opacity: feedbackPassOpacity },
          ]}
        >
          <Text style={[styles.swipeFeedbackText, styles.swipeFeedbackTextPass]}>✕</Text>
        </Animated.View>
      </View>
    </View>
  );
});

export default memo(SwipeDeck);

const styles = StyleSheet.create({
  swiperDeck: {
    flex: 1,
    width: "100%",
    zIndex: 2,
    elevation: 2,
  },
  cardStyle: {
    width: CARD_WIDTH,
    alignSelf: "center",
    marginLeft: (Dimensions.get("window").width - CARD_WIDTH) / 2,
    marginBottom: 28,
  },
  cardShell: {
    width: CARD_WIDTH,
    alignSelf: "center",
  },
  swipeFeedbackLayer: {
    position: "absolute",
    top: 22,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 4,
    elevation: 4,
  },
  swipeFeedback: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  swipeFeedbackLike: {
    borderColor: "rgba(34, 197, 94, 0.35)",
  },
  swipeFeedbackPass: {
    borderColor: "rgba(220, 38, 38, 0.35)",
  },
  swipeFeedbackText: {
    fontSize: 18,
    fontWeight: "800",
  },
  swipeFeedbackTextLike: {
    color: "#16a34a",
  },
  swipeFeedbackTextPass: {
    color: "#dc2626",
  },
});
