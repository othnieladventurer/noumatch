import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, spacing } from "../theme";

type Variant = "primary" | "ghost" | "quiet";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = "primary", loading = false, disabled = false, style }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "ghost" && styles.ghost,
        variant === "quiet" && styles.quiet,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : colors.ink} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "primary" && styles.labelPrimary,
            variant === "ghost" && styles.labelGhost,
            variant === "quiet" && styles.labelQuiet,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
    minHeight: 52,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primary: {
    backgroundColor: colors.red,
    borderWidth: 1.5,
    borderColor: colors.red,
  },
  ghost: {
    // Matches the web `.nm-btn-ghost` treatment: hairline warm border, slate label.
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  quiet: {
    backgroundColor: "transparent",
    minHeight: 44,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ translateY: 1 }],
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  labelPrimary: {
    color: "#fff",
  },
  labelGhost: {
    color: colors.inkSoft,
    fontWeight: "600",
  },
  labelQuiet: {
    color: colors.muted,
    fontWeight: "600",
  },
  row: {
    gap: spacing.sm,
  },
});
