import { View, TextInput, Button, Text, Pressable } from "react-native";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import Constants from "expo-constants";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) alert(error.message);
    else router.replace("/");
  }

  async function sendPasswordReset() {
    if (!email) {
      alert("Enter your email first.");
      return;
    }

    setResetSending(true);
    setResetMessage("");
    const owner = Constants.expoConfig?.owner;
    const slug = Constants.expoConfig?.slug;
    const redirectTo =
      owner && slug
        ? `https://auth.expo.dev/@${owner}/${slug}/auth/reset`
        : Linking.createURL("/auth/reset");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      alert(error.message);
    } else {
      setResetMessage("Check your email for a reset link.");
    }

    setResetSending(false);
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />

      <Text>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, marginBottom: 20, padding: 10 }}
      />

      <Button title="Login" onPress={login} />
      <Pressable onPress={sendPasswordReset} style={{ marginTop: 12 }}>
        <Text style={{ color: "#2563eb", textAlign: "center" }}>
          {resetSending ? "Sending reset link..." : "Forgot password?"}
        </Text>
      </Pressable>
      {resetMessage ? (
        <Text style={{ marginTop: 8, color: "#16a34a", textAlign: "center" }}>
          {resetMessage}
        </Text>
      ) : null}
      <Button title="Create account" onPress={() => router.push("/auth/signup")} />
    </View>
  );
}