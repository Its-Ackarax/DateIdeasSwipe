import { View, Text, Button } from "react-native";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { generateCode } from "../../services/generateCode";

export default function LinkPartner() {
  const [code, setCode] = useState<string | null>(null);

  async function createInvite() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      alert("Not logged in");
      return;
    }

    const inviteCode = generateCode();

    const { error } = await supabase.from("couples").insert({
      user1: user.id,
      code: inviteCode,
    });

    if (error) alert(error.message);
    else setCode(inviteCode);
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 22 }}>Link Partner</Text>

      <Button title="Generate Invite Code" onPress={createInvite} />

      {code && (
        <Text style={{ marginTop: 20, fontSize: 20 }}>
          Your code: {code}
        </Text>
      )}
    </View>
  );
}