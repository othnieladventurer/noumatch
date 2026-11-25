import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { resendOtp, verifyOtp } from "../api/auth";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { colors, radius, spacing, useTheme, useThemedStyles, useTypography } from "../theme";

const CODE_LENGTH = 4;

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ userId?: string; email?: string }>();
  const userId = params.userId ? Number(params.userId) : NaN;
  const { reload } = useAuth();
  const styles = useThemedStyles(baseStyles);
  const type = useTypography();
  const { colors: theme } = useTheme();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = async (value: string) => {
    if (submitting.current) return;
    if (!Number.isFinite(userId)) {
      setError("Inscription introuvable. Recommencez depuis le formulaire.");
      return;
    }

    submitting.current = true;
    setLoading(true);
    setError("");

    try {
      await verifyOtp(userId, value);
      await reload();
      router.replace("/home");
    } catch (err) {
      setError(apiErrorMessage(err, "Code invalide. Réessayez."));
      setCode("");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    setError("");
    if (digits.length === CODE_LENGTH) {
      submit(digits);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || !Number.isFinite(userId)) return;

    setNotice("");
    setError("");

    try {
      await resendOtp(userId);
      setCooldown(60);
      setCode("");
      setNotice("Un nouveau code vient de partir sur votre email.");
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible de renvoyer le code pour l'instant."));
    }
  };

  return (
    <Screen>
      <Text style={[type.kicker, styles.kicker]}>Étape 2 sur 2</Text>
      <Text style={[type.h1, styles.title]}>Vérifiez votre email</Text>
      <Text style={[type.body, styles.subtitle]}>
        Nous avons envoyé un code à 4 chiffres{params.email ? ` à ${params.email}` : ""}. Il est valable quelques
        minutes.
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {notice ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <TextInput
        value={code}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        autoFocus
        placeholder="••••"
        placeholderTextColor={theme.placeholder}
        style={[styles.codeInput, Boolean(error) && styles.codeInputError]}
        editable={!loading}
        textContentType="oneTimeCode"
      />

      <Button title="Vérifier" onPress={() => submit(code)} loading={loading} style={styles.submit} />

      <Pressable onPress={resend} disabled={cooldown > 0} style={styles.resend} hitSlop={8}>
        <Text style={[styles.resendText, cooldown > 0 && styles.resendTextMuted]}>
          {cooldown > 0 ? `Renvoyer le code dans ${cooldown}s` : "Renvoyer le code"}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.replace("/register")} style={styles.changeEmail} hitSlop={8}>
        <Text style={styles.changeEmailText}>Changer d'adresse email</Text>
      </Pressable>
    </Screen>
  );
}

const baseStyles = StyleSheet.create({
  kicker: {
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  errorBox: {
    backgroundColor: "#fdecec",
    borderWidth: 1,
    borderColor: "#f7caca",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.redDark,
    fontSize: 12.5,
    lineHeight: 16.5,
  },
  noticeBox: {
    backgroundColor: "#f0f7f1",
    borderWidth: 1,
    borderColor: "#cfe6d5",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: spacing.md,
  },
  noticeText: {
    color: colors.success,
    fontSize: 12.5,
    lineHeight: 16.5,
  },
  codeInput: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    minHeight: 76,
    textAlign: "center",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 14,
    paddingLeft: 14,
    color: colors.ink,
  },
  codeInputError: {
    borderColor: colors.red,
  },
  submit: {
    marginTop: spacing.lg,
  },
  resend: {
    alignSelf: "center",
    marginTop: spacing.lg,
  },
  resendText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.red,
  },
  resendTextMuted: {
    color: colors.muted,
    fontWeight: "600",
  },
  changeEmail: {
    alignSelf: "center",
    marginTop: spacing.sm,
  },
  changeEmailText: {
    fontSize: 12,
    color: colors.muted,
  },
});
