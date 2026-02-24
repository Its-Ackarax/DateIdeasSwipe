import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { supabase } from "../../lib/supabase";
import { generateCode } from "../../services/generateCode";
import { saveMatch } from "../../services/saveMatch";

export default function LinkPartner() {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function createInvite() {
    setLoading(true);

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      alert("Not logged in");
      setLoading(false);
      return;
    }

    // check if already in couple
    const { data: existing } = await supabase
      .from("couples")
      .select("*")
      .or(`user1.eq.${user.id},user2.eq.${user.id}`)
      .maybeSingle();

    if (existing) {
      alert("You are already linked with a partner");
      setLoading(false);
      return;
    }

    const inviteCode = generateCode();

    const { error } = await supabase.from("couples").insert({
      user1: user.id,
      code: inviteCode,
    });

    if (error) {
      alert(error.message);
    } else {
      setCode(inviteCode);
    }

    setLoading(false);
  }

  async function joinPartner() {
    setLoading(true);

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    // find invite
    const { data: couple, error } = await supabase
      .from("couples")
      .select("*")
      .eq("code", input.trim())
      .single();

    if (error || !couple) {
      alert("Invalid code");
      setLoading(false);
      return;
    }

    if (couple.user2 !== null) {
      alert("This code is already used");
      setLoading(false);
      return;
    }

    // join couple
    const { error: updateError } = await supabase
      .from("couples")
      .update({ user2: user.id })
      .eq("id", couple.id);

    if (updateError) {
      alert(updateError.message);
    } else {
      const userIds = [String(couple.user1), String(user.id)];

      await supabase
        .from("swipes")
        .update({ couple_id: couple.id })
        .in("user_id", userIds)
        .is("couple_id", null);

      const { data: swipeData, error: swipeError } = await supabase
        .from("swipes")
        .select("date_id, user_id")
        .eq("couple_id", couple.id)
        .eq("liked", true);

      if (swipeError) {
        console.log(swipeError);
      } else if (swipeData) {
        const likedByDate = new Map<string, Set<string>>();

        swipeData.forEach((row) => {
          const dateId = String(row.date_id);
          const userId = String(row.user_id);

          if (!likedByDate.has(dateId)) {
            likedByDate.set(dateId, new Set());
          }

          likedByDate.get(dateId)?.add(userId);
        });

        for (const [dateId, users] of likedByDate.entries()) {
          if (users.size >= 2) {
            await saveMatch(couple.id, dateId);
          }
        }
      }

      alert("Successfully linked!");
      router.replace("/(tabs)/profile");
    }

    setLoading(false);

    console.log("Couple row:", couple);
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 15 }}>
      <Text style={{ fontSize: 22 }}>Link Partner</Text>

      <Button title="Generate Invite Code" onPress={createInvite} disabled={loading} />

      {code && <Text>Your code: {code}</Text>}

      <TextInput
        placeholder="Enter partner code"
        value={input}
        onChangeText={setInput}
        style={{
          borderWidth: 1,
          width: 200,
          padding: 10,
          borderRadius: 8,
          textAlign: "center",
        }}
      />

      <Button title="Join Partner" onPress={joinPartner} disabled={loading} />
    </View>
  );
}