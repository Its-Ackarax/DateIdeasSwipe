import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
};

export default function SettingsRow({
  title,
  subtitle,
  icon,
  right,
  onPress,
  danger,
  disabled,
  style,
  testID,
}: Props) {
  const pressable = Boolean(onPress) && !disabled;

  return (
    <Pressable
      testID={testID}
      accessibilityRole={pressable ? "button" : undefined}
      disabled={!pressable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        danger && styles.rowDanger,
        disabled && styles.rowDisabled,
        pressed && pressable && styles.rowPressed,
        style,
      ]}
    >
      <View style={styles.left}>
        {icon ? (
          <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
            <Ionicons
              name={icon}
              size={18}
              color={danger ? "#991b1b" : "#0f172a"}
            />
          </View>
        ) : null}
        <View style={styles.textCol}>
          <Text style={[styles.title, danger && styles.titleDanger]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, danger && styles.subtitleDanger]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {right}
        {pressable ? (
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  rowDanger: {
    backgroundColor: "rgba(254, 226, 226, 0.92)",
    borderColor: "rgba(248, 113, 113, 0.35)",
  },
  rowDisabled: {
    opacity: 0.6,
  },
  rowPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(226, 232, 240, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  iconWrapDanger: {
    backgroundColor: "rgba(254, 202, 202, 0.7)",
    borderColor: "rgba(248, 113, 113, 0.35)",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  titleDanger: {
    color: "#991b1b",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: "#475569",
  },
  subtitleDanger: {
    color: "#7f1d1d",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});

