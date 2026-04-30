import { useCallback } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import * as NavigationBar from "expo-navigation-bar";

type NavBarOptions = {
  backgroundColor: string;
  buttonStyle?: "light" | "dark";
  position?: "relative" | "absolute";
};

export default function useAndroidNavigationBar(options: NavBarOptions) {
  const { backgroundColor, buttonStyle = "dark", position = "relative" } = options;

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;

      (async () => {
        try {
          await NavigationBar.setPositionAsync(position);
          await NavigationBar.setBackgroundColorAsync(backgroundColor);
          await NavigationBar.setButtonStyleAsync(buttonStyle);
        } catch {
          // Best-effort: some devices/launchers may not allow full control.
        }
      })();

      return undefined;
    }, [backgroundColor, buttonStyle, position])
  );
}

