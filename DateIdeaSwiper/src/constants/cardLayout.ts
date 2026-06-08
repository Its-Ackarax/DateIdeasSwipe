import { Dimensions } from "react-native";

const WINDOW_WIDTH = Dimensions.get("window").width;
const WINDOW_HEIGHT = Dimensions.get("window").height;

export const CARD_WIDTH = Math.round(WINDOW_WIDTH * 0.88);
export const CARD_HEIGHT = Math.round(WINDOW_HEIGHT * 0.64);
/** Empty deck message — shorter than a date card but same width/proportions. */
export const EMPTY_DECK_CARD_HEIGHT = Math.round(CARD_HEIGHT * 0.85);
export const CARD_LEFT = (WINDOW_WIDTH - CARD_WIDTH) / 2;
/** Nudge card + pink stage upward so they sit farther from the tab bar. */
export const CARD_STAGE_LIFT = 10;
export const CARD_TOP_OFFSET = 12 - CARD_STAGE_LIFT;
export const CARD_AREA_MARGIN_BOTTOM = 28;
