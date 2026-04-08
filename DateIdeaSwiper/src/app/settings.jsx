import { View, Text } from "react-native";

export default function Settings() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Settings</Text>
      <Text style={{ marginTop: 8, color: "#6b7280" }}>
        Settings content coming soon.
      </Text>
    </View>
  );
}
