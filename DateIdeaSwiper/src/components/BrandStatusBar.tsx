import { StatusBar } from "expo-status-bar";

/**
 * Light status icons + translucent bar on Android so the screen’s pink gradient
 * continues behind the status bar (avoids a flat solid bar that never quite matches).
 */
export default function BrandStatusBar() {
  return <StatusBar style="light" translucent backgroundColor="transparent" />;
}
