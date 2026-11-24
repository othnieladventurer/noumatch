import { Redirect, router } from "expo-router";
import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { colors, radius, spacing, type } from "../theme";

// Native aspect ratio of the cropped wordmark, so `contain` never letterboxes
// and the logo's first pixel sits exactly on the content margin.
const WORDMARK_ASPECT = 1405 / 189;

/**
 * NouMatch — welcome screen (Premium Editorial).
 *
 * One column, one alignment axis, four sections:
 *   header → editorial introduction → photograph → account actions.
 *
 * Everything is laid out in normal flex flow on the app background: no full-bleed
 * hero, no overlapping panel, no absolute-positioned composition. `Screen` keeps the
 * safe-area insets and provides scrolling as a fallback on short devices.
 */
export default function WelcomeScreen() {
  const { status } = useAuth();
  const { width, height } = useWindowDimensions();
  const [photoFailed, setPhotoFailed] = useState(false);

  if (status === "loading") return null;
  if (status === "signedIn") return <Redirect href="/home" />;

  // Phone-scale type, clamped so wide devices stay restrained and small ones don't wrap badly.
  const headingSize = Math.min(27, Math.max(22, width * 0.07));
  const logoHeight = Math.min(26, Math.max(20, width * 0.065));
  // Never wider than the space left beside the settings control.
  const logoWidth = Math.min(logoHeight * WORDMARK_ASPECT, width - 44 - 60);
  // Photography: ~35-38% of the viewport, clamped so it neither dominates nor disappears
  // and so a 720dp device still fits header + copy + photo + both actions without scrolling.
  const photoHeight = Math.min(340, Math.max(160, height * 0.35));

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Image
          source={require("../../assets/brand/logo-wordmark.png")}
          style={{ height: logoHeight, width: logoWidth }}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="NouMatch"
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Paramètres"
          accessibilityHint="Ouvre les paramètres de l'application"
          hitSlop={8}
          onPress={() => router.push("/settings")}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
        >
          <Image source={require("../../assets/brand/gear.png")} style={styles.settingsIcon} resizeMode="contain" />
        </Pressable>
      </View>

      <View style={styles.intro}>
        <Text style={type.eyebrow} maxFontSizeMultiplier={1.2}>
          Rencontres authentiques en Haïti
        </Text>

        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={1.15}
          style={[styles.heading, { fontSize: headingSize, lineHeight: headingSize * 1.15 }]}
        >
          Des rencontres vraies.{"\n"}Des liens sincères.
        </Text>

        <Text style={styles.support} maxFontSizeMultiplier={1.3}>
          Rencontrez des personnes qui vous ressemblent, au rythme qui vous convient.
        </Text>
      </View>

      <View style={[styles.photoFrame, { height: photoHeight }]}>
        {photoFailed ? (
          <View style={styles.photoFallback} />
        ) : (
          <Image
            source={require("../../assets/brand/welcome-editorial.jpg")}
            style={styles.photo}
            resizeMode="cover"
            onError={() => setPhotoFailed(true)}
            accessible
            accessibilityLabel="Un couple complice partage un moment naturel"
          />
        )}
      </View>

      <View style={styles.actions}>
        <Button title="Créer mon compte" onPress={() => router.push("/register")} />
        <Button title="J'ai déjà un compte" variant="ghost" onPress={() => router.push("/login")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.md,
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsButtonPressed: {
    opacity: 0.7,
  },
  settingsIcon: {
    width: 19,
    height: 19,
  },
  intro: {
    marginTop: spacing.xl,
  },
  heading: {
    marginTop: spacing.sm + 2,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: colors.ink,
  },
  support: {
    marginTop: spacing.sm + 2,
    maxWidth: 330,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  photoFrame: {
    // Fixed-height editorial plate: cropped to these bounds, never laid out at intrinsic size.
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.creamDeep,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoFallback: {
    flex: 1,
    backgroundColor: colors.creamDeep,
  },
  actions: {
    marginTop: "auto",
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
});
