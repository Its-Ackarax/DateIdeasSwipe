import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  CARD_LEFT,
  CARD_TOP_OFFSET,
  CARD_WIDTH,
} from "../constants/cardLayout";
import DateCard from "./DateCard";
import type { DateIdea } from "../types/date";
import {
  prefetchDateImageUrls,
  prefetchUpcomingFromDeck,
} from "../utils/prefetchDateImages";

const WINDOW_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = WINDOW_WIDTH * 0.25;
const SWIPE_VELOCITY_THRESHOLD = 800;
const SWIPE_OFF_DURATION_MS = 260;
const PREFETCH_ON_DRAG_PX = 40;

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
  const [headIndex, setHeadIndex] = useState(0);
  const headIndexRef = useRef(0);
  const panTranslateX = useSharedValue(0);
  const panTranslateY = useSharedValue(0);
  const isSwipeLocked = useSharedValue(false);
  const gesturePrefetchDone = useSharedValue(0);
  const feedbackLikeOpacity = useRef(new Animated.Value(0)).current;
  const feedbackPassOpacity = useRef(new Animated.Value(0)).current;

  const cards = useMemo(
    () => deckDates.filter((card): card is DateIdea => card != null && card.id != null),
    [deckDates]
  );

  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const firstCardId = cards[0]?.id;
  const currentCard = cards[headIndex];
  const nextCard = cards[headIndex + 1];

  headIndexRef.current = headIndex;

  const completeSwipe = useCallback(
    (toRight: boolean) => {
      const index = headIndexRef.current;
      setHeadIndex((prev) => prev + 1);
      if (toRight) onSwipedRight(index);
      else onSwipedLeft(index);
    },
    [onSwipedLeft, onSwipedRight]
  );

  const completeSwipeRef = useRef(completeSwipe);
  completeSwipeRef.current = completeSwipe;

  const runCompleteSwipe = useCallback((toRight: boolean) => {
    completeSwipeRef.current(toRight);
  }, []);

  const prefetchUpcoming = useCallback(() => {
    prefetchUpcomingFromDeck(cardsRef.current, headIndexRef.current, 3);
  }, []);

  const prefetchUpcomingRef = useRef(prefetchUpcoming);
  prefetchUpcomingRef.current = prefetchUpcoming;

  const runPrefetchUpcoming = useCallback(() => {
    prefetchUpcomingRef.current();
  }, []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .onStart(() => {
          if (isSwipeLocked.value) return;
          gesturePrefetchDone.value = 0;
          runOnJS(runPrefetchUpcoming)();
        })
        .onUpdate((event) => {
          if (isSwipeLocked.value) return;
          panTranslateX.value = event.translationX;
          panTranslateY.value = event.translationY;
          if (
            gesturePrefetchDone.value === 0 &&
            Math.abs(event.translationX) > PREFETCH_ON_DRAG_PX
          ) {
            gesturePrefetchDone.value = 1;
            runOnJS(runPrefetchUpcoming)();
          }
        })
        .onEnd((event) => {
          if (isSwipeLocked.value) return;

          const shouldSwipe =
            Math.abs(panTranslateX.value) > SWIPE_THRESHOLD ||
            Math.abs(event.velocityX) > SWIPE_VELOCITY_THRESHOLD;

          if (!shouldSwipe) {
            panTranslateX.value = withSpring(0, { damping: 20, stiffness: 200 });
            panTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
            return;
          }

          isSwipeLocked.value = true;
          const toRight = panTranslateX.value > 0;
          runOnJS(runPrefetchUpcoming)();
          const destination = toRight ? WINDOW_WIDTH * 1.5 : -WINDOW_WIDTH * 1.5;

          panTranslateX.value = withTiming(
            destination,
            { duration: SWIPE_OFF_DURATION_MS },
            (finished) => {
              if (finished) {
                runOnJS(runCompleteSwipe)(toRight);
              }
            }
          );
        }),
    [
      gesturePrefetchDone,
      isSwipeLocked,
      panTranslateX,
      panTranslateY,
      runCompleteSwipe,
      runPrefetchUpcoming,
    ]
  );

  useEffect(() => {
    const current = cards[headIndex];
    if (current?.image) {
      prefetchDateImageUrls([current.image]);
    }
    prefetchUpcomingFromDeck(cards, headIndex, 3);
  }, [cards, headIndex]);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      panTranslateX.value,
      [-WINDOW_WIDTH / 3, 0, WINDOW_WIDTH / 3],
      [-12, 0, 12],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: panTranslateX.value },
        { translateY: panTranslateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const resetPan = useCallback(() => {
    isSwipeLocked.value = false;
    cancelAnimation(panTranslateX);
    cancelAnimation(panTranslateY);
    panTranslateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    panTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
  }, [isSwipeLocked, panTranslateX, panTranslateY]);

  const resetTopCard = useCallback(() => {
    resetPan();
  }, [resetPan]);

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

  useLayoutEffect(() => {
    cancelAnimation(panTranslateX);
    cancelAnimation(panTranslateY);
    panTranslateX.value = 0;
    panTranslateY.value = 0;
    isSwipeLocked.value = false;
  }, [headIndex, isSwipeLocked, panTranslateX, panTranslateY]);

  useEffect(() => {
    setHeadIndex(0);
    isSwipeLocked.value = false;
    cancelAnimation(panTranslateX);
    cancelAnimation(panTranslateY);
    panTranslateX.value = 0;
    panTranslateY.value = 0;
  }, [swiperKey, firstCardId, isSwipeLocked, panTranslateX, panTranslateY]);

  if (cards.length === 0 || headIndex >= cards.length || !currentCard) {
    return <View style={styles.swiperDeck} collapsable={false} />;
  }

  return (
    <View style={styles.swiperDeck} collapsable={false}>
      <View style={styles.cardContainer}>
        {nextCard ? (
          <View style={styles.preloadSlot} pointerEvents="none">
            <DateCard item={nextCard} />
          </View>
        ) : null}
        <GestureDetector gesture={panGesture}>
          <Reanimated.View
            key={String(currentCard.id)}
            style={[styles.cardSlot, styles.topCardSlot, cardAnimatedStyle]}
            collapsable={false}
          >
            <View style={styles.cardShell} collapsable={false}>
              <DateCard item={currentCard} />
            </View>
          </Reanimated.View>
        </GestureDetector>
      </View>
      <View pointerEvents="none" style={styles.swipeFeedbackLayer}>
        <View style={styles.swipeFeedbackSlot}>
          <View style={[styles.swipeFeedback, styles.swipeFeedbackSizer]} pointerEvents="none">
            <Text style={styles.swipeFeedbackText}>✔</Text>
          </View>
          <Animated.View
            style={[
              styles.swipeFeedback,
              styles.swipeFeedbackOverlay,
              styles.swipeFeedbackLike,
              { opacity: feedbackLikeOpacity },
            ]}
          >
            <Text style={[styles.swipeFeedbackText, styles.swipeFeedbackTextLike]}>✔</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.swipeFeedback,
              styles.swipeFeedbackOverlay,
              styles.swipeFeedbackPass,
              { opacity: feedbackPassOpacity },
            ]}
          >
            <Text style={[styles.swipeFeedbackText, styles.swipeFeedbackTextPass]}>✕</Text>
          </Animated.View>
        </View>
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
  cardContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  cardSlot: {
    position: "absolute",
    top: CARD_TOP_OFFSET,
    width: CARD_WIDTH,
    left: CARD_LEFT,
  },
  preloadSlot: {
    position: "absolute",
    top: CARD_TOP_OFFSET,
    width: CARD_WIDTH,
    left: CARD_LEFT,
    opacity: 0,
    zIndex: 0,
  },
  topCardSlot: {
    zIndex: 1,
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
  swipeFeedbackSlot: {
    position: "relative",
  },
  swipeFeedbackSizer: {
    opacity: 0,
  },
  swipeFeedbackOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
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
