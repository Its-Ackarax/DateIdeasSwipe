import { View, Text, Button } from "react-native";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "expo-router";

export default function Profile() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 15 }}>
      <Text style={{ fontSize: 22 }}>Profile</Text>

      <Button
        title="Link accounts with partner"
        onPress={() => router.push("/profile/link")}
      />

      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}