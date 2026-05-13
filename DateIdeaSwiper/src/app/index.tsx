import { type Href, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { hasCompletedOnboarding } from "../lib/onboarding";
import { supabase } from "../lib/supabase";

type Gate = "loading" | "tabs" | "login" | "onboarding";

export default function RootIndex() {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setGate("tabs");
        return;
      }
      if (error) {
        setGate("login");
        return;
      }
      const done = await hasCompletedOnboarding();
      if (cancelled) return;
      setGate(done ? "login" : "onboarding");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (gate === "loading") return;
    if (gate === "tabs") router.replace("/(tabs)");
    else if (gate === "login") router.replace("/auth/login");
    else router.replace("/onboarding" as Href);
  }, [gate, router]);

  return (
    <View style={styles.boot}>
      <ActivityIndicator size="large" color="#fb7185" />
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff1f2",
  },
});
