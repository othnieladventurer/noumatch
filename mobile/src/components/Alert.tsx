import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, useThemedStyles } from "../theme";

type Tone = "error" | "warning" | "success";

/** Mirrors `.auth-alert` from the web auth stylesheet. */
export function Alert({ tone = "error", children }: { tone?: Tone; children: React.ReactNode }) {
  const styles = useThemedStyles(baseStyles);
  return (
    <View style={[styles.box, tone === "error" && styles.error, tone === "warning" && styles.warning, tone === "success" && styles.success]}>
      <Text
        style={[
          styles.text,
          tone === "error" && styles.errorText,
          tone === "warning" && styles.warningText,
          tone === "success" && styles.successText,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  text: {
    fontSize: 12.5,
    lineHeight: 17.5,
  },
  error: {
    backgroundColor: "#fdecec",
    borderColor: "#f7caca",
  },
  errorText: {
    color: colors.redDark,
  },
  warning: {
    backgroundColor: "#fff7e6",
    borderColor: "#f5dfae",
  },
  warningText: {
    color: "#8a5a00",
  },
  success: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  successText: {
    color: colors.success,
  },
});
