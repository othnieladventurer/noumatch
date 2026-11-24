import Constants from "expo-constants";
import { router } from "expo-router";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "../components/Screen";
import { colors, radius, spacing, type } from "../theme";

const SITE = "https://noumatch.com";

export default function SettingsScreen() {
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const openLink = (path: string) => {
    void Linking.openURL(`${SITE}${path}`);
  };

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backGlyph}>←</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Paramètres
        </Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.card}>
        <View style={[styles.row, styles.rowDivider]}>
          <Text style={styles.rowLabel}>Version de l'application</Text>
          <Text style={styles.rowValue}>{version}</Text>
        </View>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Conditions d'utilisation"
          onPress={() => openLink("/terms")}
          style={({ pressed }) => [styles.row, styles.rowDivider, pressed && styles.pressed]}
        >
          <Text style={styles.rowLabel}>Conditions d'utilisation</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Politique de confidentialité"
          onPress={() => openLink("/privacy")}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text style={styles.rowLabel}>Politique de confidentialité</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      <Text style={[type.body, styles.note]}>NouMatch — rencontres authentiques en Haïti.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backGlyph: {
    fontSize: 22,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 54,
    gap: spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontSize: 15,
    color: colors.ink,
    flexShrink: 1,
  },
  rowValue: {
    fontSize: 15,
    color: colors.muted,
  },
  chevron: {
    fontSize: 20,
    color: colors.muted,
  },
  note: {
    marginTop: spacing.lg,
    textAlign: "center",
  },
});
