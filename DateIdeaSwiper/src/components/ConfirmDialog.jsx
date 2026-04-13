import { Modal, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  /** When true, only the confirm button is shown (single-button dialog). */
  hideCancel = false,
  destructive = false,
  /** Softer hot pink for primary (non-destructive) confirm buttons */
  confirmPink = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const showCancel = !hideCancel && cancelText != null;
  const primaryStyle =
    destructive ? styles.dangerButton : confirmPink ? styles.primaryButtonPink : styles.primaryButton;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={loading ? undefined : onCancel} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={[styles.actions, !showCancel && styles.actionsSingle]}>
            {showCancel ? (
              <Pressable
                disabled={loading}
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  pressed && !loading && styles.buttonPressed,
                  loading && styles.buttonDisabled,
                ]}
                onPress={onCancel}
              >
                <Text style={styles.secondaryButtonText}>{cancelText}</Text>
              </Pressable>
            ) : null}

            <Pressable
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                !showCancel && styles.buttonSingle,
                primaryStyle,
                pressed && !loading && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={onConfirm}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator
                    size="small"
                    color={destructive ? styles.dangerButtonText.color : "#ffffff"}
                  />
                  <Text
                    style={destructive ? styles.dangerButtonText : styles.primaryButtonText}
                  >
                    Working…
                  </Text>
                </View>
              ) : (
                <Text
                  style={destructive ? styles.dangerButtonText : styles.primaryButtonText}
                >
                  {confirmText}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.18)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },
  message: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: "#475569",
  },
  actions: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  actionsSingle: {
    justifyContent: "center",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonSingle: {
    flex: 0,
    minWidth: 160,
  },
  primaryButton: {
    backgroundColor: "#e11d48",
    borderWidth: 1,
    borderColor: "rgba(190, 18, 60, 0.35)",
  },
  primaryButtonPink: {
    backgroundColor: "#fb7185",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.45)",
  },
  secondaryButton: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  dangerButton: {
    backgroundColor: "rgba(248, 126, 160, 0.42)",
    borderWidth: 1,
    borderColor: "rgba(217, 70, 239, 0.18)",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "800",
    fontSize: 15,
  },
  dangerButtonText: {
    color: "#9d174d",
    fontWeight: "800",
    fontSize: 15,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

