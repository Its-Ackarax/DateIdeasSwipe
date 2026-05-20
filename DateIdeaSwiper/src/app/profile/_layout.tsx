import { Stack } from "expo-router";
import AuthGate from "../../components/AuthGate";

export default function Layout() {
  return (
    <AuthGate>
      <Stack
        screenOptions={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </AuthGate>
  );
}