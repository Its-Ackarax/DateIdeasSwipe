import { Dimensions } from "react-native";

const WINDOW_WIDTH = Dimensions.get("window").width;
const WINDOW_HEIGHT = Dimensions.get("window").height;

export const CARD_WIDTH = Math.round(WINDOW_WIDTH * 0.88);
export const CARD_HEIGHT = Math.round(WINDOW_HEIGHT * 0.64);
export const CARD_LEFT = (WINDOW_WIDTH - CARD_WIDTH) / 2;
export const CARD_TOP_OFFSET = 12;
