import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, radius, spacing, useTheme, useThemedStyles } from "../theme";

export type HintTone = "error" | "success" | "muted";

type Props = TextInputProps & {
  label: string;
  /** Shown as a right-aligned control beside the label (e.g. "Mot de passe oublié ?"). */
  accessory?: React.ReactNode;
  error?: string;
  hint?: string;
  hintTone?: HintTone;
};

/**
 * Mirrors the web `.auth-field` block from `frontend/src/styles/auth-redesign.css`:
 * uppercase 12/700 label, 52dp input, 1.5dp border, brand-coloured focus ring,
 * and a small helper line under the field.
 */
export function Field({ label, accessory, error, hint, hintTone = "muted", onFocus, onBlur, style, ...inputProps }: Props) {
  const [focused, setFocused] = useState(false);
  const styles = useThemedStyles(baseStyles);
  const { colors: theme } = useTheme();

  const showSuccess = Boolean(hint) && !error && hintTone === "success";

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {accessory}
      </View>

      <TextInput
        placeholderTextColor={theme.placeholder}
        {...inputProps}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          focused && styles.inputFocused,
          Boolean(error) && styles.inputError,
          showSuccess && styles.inputSuccess,
          style,
        ]}
      />

      {error ? (
        <Text style={[styles.hint, styles.hintError]}>{error}</Text>
      ) : hint ? (
        <Text
          style={[
            styles.hint,
            hintTone === "success" && styles.hintSuccess,
            hintTone === "muted" && styles.hintMuted,
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
    gap: spacing.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.inkSoft,
  },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.ink,
  },
  inputFocused: {
    borderColor: colors.red,
  },
  inputError: {
    borderColor: colors.red,
  },
  inputSuccess: {
    borderColor: colors.success,
  },
  hint: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 14.5,
  },
  hintError: {
    color: colors.red,
  },
  hintSuccess: {
    color: colors.success,
  },
  hintMuted: {
    color: colors.placeholder,
  },
});
