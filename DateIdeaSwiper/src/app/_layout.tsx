import { Stack } from "expo-router";
import { LikesProvider } from "../store/LikesContext";

export default function RootLayout() {
  return (
    <LikesProvider>
      <Stack screenOptions={{ headerShown:false }} />
    </LikesProvider>
  );
}