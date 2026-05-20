import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRequireAuth } from "../hooks/useRequireAuth";

type AuthGateProps = {
  children: ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const { isReady, isAuthed } = useRequireAuth();

  if (!isReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#fb7185" />
      </View>
    );
  }

  if (!isAuthed) {
    return null;
  }

  return children;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff1f2",
  },
});
