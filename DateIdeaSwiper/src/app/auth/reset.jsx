import { View, Text, TextInput, Button } from "react-native";
import { useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function ResetPassword() {
  const params = useLocalSearchParams();
  const accessToken = useMemo(
    () => (typeof params.access_token === "string" ? params.access_token : ""),
    [params.access_token]
  );
  const refreshToken = useMemo(
    () =>
      typeof params.refresh_token === "string" ? params.refresh_token : "",
    [params.refresh_token]
  );
  const errorDescription = useMemo(
    () =>
      typeof params.error_description === "string"
        ? params.error_description
        : "",
    [params.error_description]
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleReset() {
    if (!accessToken || !refreshToken) {
      alert("Reset link is missing tokens. Please request a new link.");
      return;
    }
    if (!password || password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      alert(sessionError.message);
      setSaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setMessage("Password updated. You can log in now.");
    setSaving(false);
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 16 }}>
        Reset password
      </Text>

      {errorDescription ? (
        <Text style={{ color: "#dc2626", marginBottom: 12 }}>
          {errorDescription}
        </Text>
      ) : null}

      <Text>New password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />

      <Text>Confirm password</Text>
      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        style={{ borderWidth: 1, marginBottom: 20, padding: 10 }}
      />

      <Button
        title={saving ? "Updating..." : "Update password"}
        onPress={handleReset}
      />
      {message ? (
        <Text style={{ marginTop: 10, color: "#16a34a" }}>{message}</Text>
      ) : null}

      <View style={{ height: 12 }} />
      <Button title="Back to login" onPress={() => router.replace("/auth/login")} />
    </View>
  );
}
