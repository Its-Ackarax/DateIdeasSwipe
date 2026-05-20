import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

type MatchesScreenHeaderProps = {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function MatchesScreenHeader({
  compact = false,
  style,
}: MatchesScreenHeaderProps) {
  return (
    <View style={[styles.outer, compact && styles.outerCompact, style]}>
      <View style={[styles.card, compact && styles.cardCompact]}>
        <View style={styles.label}>
          <Text style={styles.labelText}>Matches</Text>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.heart}>❤</Text>
          <Text style={styles.title}>Shared date ideas</Text>
        </View>
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
          Date ideas you and your partner both liked.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 22,
  },
  outerCompact: {
    marginBottom: 8,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.18)",
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    alignItems: "center",
    gap: 6,
    alignSelf: "stretch",
  },
  cardCompact: {
    paddingVertical: 12,
  },
  label: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.16)",
  },
  labelText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#be123c",
    textTransform: "uppercase",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    justifyContent: "center",
  },
  heart: {
    fontSize: 18,
    color: "#e11d48",
  },
  title: {
    fontSize: 20,
    color: "#7f1d1d",
    letterSpacing: 0.3,
    fontFamily: "Pacifico_400Regular",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  subtitleCompact: {
    fontSize: 12,
  },
});
