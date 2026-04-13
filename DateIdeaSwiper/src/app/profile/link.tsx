import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { generateCode } from "../../services/generateCode";
import { saveMatch } from "../../services/saveMatch";
import ConfirmDialog from "../../components/ConfirmDialog";

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
  confirmPink?: boolean;
};

export default function LinkPartner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
  });
  const afterAlertConfirmRef = useRef<(() => void) | null>(null);

  const openAlert = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmPink?: boolean;
      onConfirm?: () => void;
    }) => {
      afterAlertConfirmRef.current = opts.onConfirm ?? null;
      setAlertState({
        visible: true,
        title: opts.title,
        message: opts.message,
        confirmPink: opts.confirmPink,
      });
    },
    []
  );

  const closeAlert = useCallback(() => {
    setAlertState((s) => ({ ...s, visible: false }));
    const fn = afterAlertConfirmRef.current;
    afterAlertConfirmRef.current = null;
    fn?.();
  }, []);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
    };
  }, []);

  useEffect(() => {
    setCopyFeedback(false);
  }, [code]);

  const copyInviteCode = useCallback(async () => {
    if (!code) return;
    try {
      await Clipboard.setStringAsync(code);
      setCopyFeedback(true);
      if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
      copyFeedbackTimer.current = setTimeout(() => setCopyFeedback(false), 2500);
    } catch {
      openAlert({
        title: "Copy failed",
        message: "Could not copy the code. You can select the code above and copy it manually.",
        confirmPink: true,
      });
    }
  }, [code, openAlert]);

  async function createInvite() {
    setCreateLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        openAlert({
          title: "Not signed in",
          message: "Sign in to create an invite code.",
          confirmPink: true,
          onConfirm: () => router.replace("/auth/login"),
        });
        return;
      }

      const { data: existingList, error: existingError } = await supabase
        .from("couples")
        .select("*")
        .or(`user1.eq.${user.id},user2.eq.${user.id}`);

      if (existingError) {
        openAlert({
          title: "Could not check your link",
          message: existingError.message,
        });
        return;
      }

      const rows = existingList ?? [];
      const uid = String(user.id);

      const fullyLinked = rows.find(
        (r) =>
          r.user2 != null &&
          (String(r.user1) === uid || String(r.user2) === uid)
      );
      if (fullyLinked) {
        openAlert({
          title: "Already linked",
          message: "You are already linked with a partner.",
          confirmPink: true,
          onConfirm: () => router.replace("/(tabs)/profile"),
        });
        return;
      }

      const pendingAsCreator = rows.find(
        (r) => String(r.user1) === uid && r.user2 == null
      );
      if (pendingAsCreator) {
        const inviteCode = generateCode();
        const { error: updateError } = await supabase
          .from("couples")
          .update({ code: inviteCode })
          .eq("id", pendingAsCreator.id);

        if (updateError) {
          openAlert({
            title: "Could not update code",
            message: updateError.message,
          });
        } else {
          setCode(inviteCode);
        }
        return;
      }

      const inviteCode = generateCode();

      const { error } = await supabase.from("couples").insert({
        user1: user.id,
        code: inviteCode,
      });

      if (error) {
        openAlert({
          title: "Could not create code",
          message: error.message,
        });
      } else {
        setCode(inviteCode);
      }
    } finally {
      setCreateLoading(false);
    }
  }

  async function joinPartner() {
    setJoinLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        openAlert({
          title: "Not signed in",
          message: "Sign in to join with a partner code.",
          confirmPink: true,
          onConfirm: () => router.replace("/auth/login"),
        });
        return;
      }

      const trimmed = input.trim();
      if (!trimmed) {
        openAlert({
          title: "Code required",
          message: "Enter your partner’s invite code first.",
          confirmPink: true,
        });
        return;
      }

      const { data: couple, error } = await supabase
        .from("couples")
        .select("*")
        .eq("code", trimmed)
        .single();

      if (error || !couple) {
        openAlert({
          title: "Invalid code",
          message: "We could not find a couple with that code. Check for typos and try again.",
          confirmPink: true,
        });
        return;
      }

      if (couple.user2 !== null) {
        openAlert({
          title: "Code already used",
          message: "This invite has already been claimed. Ask your partner for a new code.",
          confirmPink: true,
        });
        return;
      }

      if (String(couple.user1) === String(user.id)) {
        openAlert({
          title: "That is your invite",
          message:
            "You created this code. Send it to your partner so they can enter it on their account to link with you.",
          confirmPink: true,
        });
        return;
      }

      const { error: updateError } = await supabase
        .from("couples")
        .update({ user2: user.id })
        .eq("id", couple.id);

      if (updateError) {
        openAlert({
          title: "Could not link",
          message: updateError.message,
        });
        return;
      }

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

      openAlert({
        title: "You’re linked",
        message: "You and your partner are connected. Enjoy swiping together!",
        confirmPink: true,
        onConfirm: () => router.replace("/(tabs)/profile"),
      });
    } finally {
      setJoinLoading(false);
    }
  }

  const busy = createLoading || joinLoading;

  return (
    <LinearGradient colors={["#fb7185", "#fff1f2", "#fff1f2"]} style={styles.page}>
      <View style={styles.topGlow} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.pageInner, { paddingTop: insets.top + 6 }]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backRow, pressed && styles.backPressed]}
            hitSlop={12}
          >
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.hero}>
            <View style={styles.heartPill}>
              <Text style={styles.heart}>❤</Text>
              <Text style={styles.heartText}>Link partner</Text>
            </View>
            <Text style={styles.title}>Connect your accounts</Text>
            <Text style={styles.subtitle}>
              One of you creates an invite code, then the other enters it below to link as a couple.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Share an invite</Text>
            <Text style={styles.sectionBody}>
              Generate a code and send it to your partner.
            </Text>
            <Pressable
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryButton,
                busy && styles.buttonDisabled,
                pressed && !busy && styles.buttonPressed,
              ]}
              onPress={createInvite}
            >
              {createLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.primaryButtonText}>Creating…</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Generate invite code</Text>
              )}
            </Pressable>

            {code ? (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Your code</Text>
                <Text selectable style={styles.codeValue}>
                  {code}
                </Text>
                <Pressable
                  onPress={copyInviteCode}
                  style={({ pressed }) => [
                    styles.copyCodeButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.copyCodeButtonText}>Copy to clipboard</Text>
                </Pressable>
                {copyFeedback ? (
                  <Text style={styles.copyFeedbackText}>Copied!</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Have a code?</Text>
            <Text style={styles.sectionBody}>
              Paste the code your partner sent you below. Then tap 'Join partner'.
            </Text>
            <Text style={styles.label}>Partner code</Text>
            <TextInput
              placeholder="Enter code"
              placeholderTextColor="#94a3b8"
              value={input}
              onChangeText={setInput}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
              editable={!busy}
              returnKeyType="done"
              onSubmitEditing={joinPartner}
            />
            <Pressable
              disabled={busy}
              style={({ pressed }) => [
                styles.secondaryButton,
                busy && styles.buttonDisabled,
                pressed && !busy && styles.buttonPressed,
              ]}
              onPress={joinPartner}
            >
              {joinLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#be123c" />
                  <Text style={styles.secondaryButtonText}>Joining…</Text>
                </View>
              ) : (
                <Text style={styles.secondaryButtonText}>Join partner</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        confirmText="OK"
        hideCancel
        confirmPink={alertState.confirmPink}
        onCancel={closeAlert}
        onConfirm={closeAlert}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "#fda4af",
    opacity: 0.22,
  },
  pageInner: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
    marginBottom: 6,
    paddingVertical: 2,
    paddingRight: 12,
  },
  backPressed: {
    opacity: 0.75,
  },
  backChevron: {
    fontSize: 28,
    fontWeight: "300",
    color: "#be123c",
    marginTop: -2,
  },
  backText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#9f1239",
  },
  hero: {
    alignItems: "center",
    marginBottom: 18,
  },
  heartPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.2)",
    marginBottom: 14,
  },
  heart: {
    fontSize: 16,
    color: "#e11d48",
  },
  heartText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#be123c",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    textAlign: "center",
    maxWidth: 360,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#0f172a",
    textAlign: "center",
  },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(251, 55, 111, 0.91)",
    borderWidth: 1,
    borderColor: "rgba(190, 18, 60, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#ffe4e9",
    borderWidth: 1,
    borderColor: "rgba(251, 113, 133, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  secondaryButtonText: {
    color: "#be123c",
    fontWeight: "800",
    fontSize: 16,
  },
  codeBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(251, 113, 133, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.22)",
    alignItems: "center",
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#be123c",
    marginBottom: 6,
  },
  codeValue: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 4,
    color: "#7f1d1d",
    marginBottom: 12,
  },
  copyCodeButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.35)",
  },
  copyCodeButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#be123c",
  },
  copyFeedbackText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#15803d",
  },
  dividerRow: {
    marginVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.35)",
  },
  dividerText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});
