import { router } from "expo-router";
import React, { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { apiErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Screen } from "../components/Screen";
import { colors, spacing, type } from "../theme";

const WORDMARK_ASPECT = 1405 / 189;
const WEB_BASE = "https://noumatch.com";

/**
 * Login — mirrors `frontend/src/pages/Login.jsx` (which hides its photo panel below
 * 1024px, so the phone experience is this cream form). Same copy, same field treatment,
 * same pill CTA and footer link.
 */
export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Renseignez votre email et votre mot de passe.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signIn(email, password);
      router.replace("/home");
    } catch (err) {
      const message = apiErrorMessage(err, "Email ou mot de passe incorrect.");
      setError(/verify/i.test(message) ? "Vérifiez votre email avant de vous connecter." : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <Image
        source={require("../../assets/brand/logo-wordmark.png")}
        style={styles.logo}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="NouMatch"
      />

      <Text style={[type.h1, styles.title]}>Bon retour.</Text>
      <Text style={styles.subtitle}>Retrouvez vos connexions et continuez votre parcours.</Text>

      {error ? <Alert>{error}</Alert> : null}

      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="email@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
      />

      <Field
        label="Mot de passe"
        accessory={
          <Pressable
            onPress={() => {
              void Linking.openURL(`${WEB_BASE}/forgot-password`);
            }}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Mot de passe oublié"
          >
            <Text style={styles.labelLink}>Mot de passe oublié</Text>
          </Pressable>
        }
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Button title="Se connecter" onPress={submit} loading={loading} style={styles.submit} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Pas encore de compte ?</Text>
        <Pressable onPress={() => router.replace("/register")} hitSlop={8}>
          <Text style={styles.footerLink}>Créer un compte</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    // Centres the form block in the viewport while still allowing a scroll
    // if the keyboard or a large font size pushes the content taller than the screen.
    justifyContent: "center",
  },
  logo: {
    width: 30 * WORDMARK_ASPECT,
    height: 30,
    marginBottom: spacing.xl,
  },
  title: {
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15.5,
    lineHeight: 24,
    color: colors.muted,
    marginBottom: spacing.xl,
  },
  labelLink: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.red,
  },
  submit: {
    marginTop: spacing.xs,
  },
  footer: {
    marginTop: spacing.lg,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 13.5,
    color: colors.muted,
  },
  footerLink: {
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.red,
  },
});
