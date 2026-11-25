import Constants from "expo-constants";
import { router } from "expo-router";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../components/Screen";
import { useAuth } from "../auth/AuthProvider";
import { colors, radius, spacing, useTheme, useThemedStyles, useTypography } from "../theme";
import { planFor } from "../utils/accountAccess";

const SITE = "https://noumatch.com";
const SUPPORT_EMAIL = "support@noumatch.com";

export default function SettingsScreen() {
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const { user, status } = useAuth();
  const plan = planFor(user);
  const type = useTypography();
  const styles = useThemedStyles(baseStyles);
  const { colors: theme, mode, setMode } = useTheme();

  const openLink = (path: string) => {
    void Linking.openURL(`${SITE}${path}`);
  };

  return (
    <Screen style={styles.screen}>
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

      {status === "signedIn" ? (
        <View style={[styles.card, styles.planCard]}>
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.rowLabel}>Mon abonnement</Text>
            <View style={[styles.planBadge, { backgroundColor: plan.background }]}>
              <Text style={[styles.planBadgeText, { color: plan.color }]}>{plan.badge}</Text>
            </View>
          </View>

          {plan.perks.map((perk) => (
            <View key={perk.label} style={[styles.row, styles.rowDivider]}>
              <Text style={styles.rowLabel}>{perk.label}</Text>
              <Text style={perk.included ? styles.perkIncluded : styles.perkLocked}>
                {perk.included ? "✓" : "🔒"}
              </Text>
            </View>
          ))}

          {plan.tier === "free" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Passer à Premium"
              onPress={() =>
                void Linking.openURL(
                  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("NouMatch — Passage à Premium")}`,
                )
              }
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.upgradeText}>Passer à Premium</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Apparence</Text>
      <View style={styles.card}>
        <View style={styles.themeRow}>
          {([
            { value: "light" as const, label: "Clair", detail: "Le thème original", icon: "sunny-outline" as const },
            { value: "dark" as const, label: "Sombre", detail: "Confort visuel le soir", icon: "moon-outline" as const },
          ]).map((option) => {
            const active = mode === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Thème ${option.label}`}
                onPress={() => setMode(option.value)}
                style={[styles.themeOption, active && styles.themeOptionActive]}
              >
                <View style={[styles.themeIcon, active && styles.themeIconActive]}>
                  <Ionicons name={option.icon} size={19} color={active ? theme.redText : theme.muted} />
                </View>
                <View style={styles.themeCopy}>
                  <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>{option.label}</Text>
                  <Text style={styles.themeDetail}>{option.detail}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <View style={[styles.row, styles.rowDivider]}>
          <Text style={styles.rowLabel}>Version de l’application</Text>
          <Text style={styles.rowValue}>{version}</Text>
        </View>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Conditions d'utilisation"
          onPress={() => openLink("/terms")}
          style={({ pressed }) => [styles.row, styles.rowDivider, pressed && styles.pressed]}
        >
          <Text style={styles.rowLabel}>Conditions d’utilisation</Text>
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

const baseStyles = StyleSheet.create({
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
    fontSize: 19,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    fontSize: 15,
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
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.muted,
  },
  themeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  themeOption: {
    flex: 1,
    minHeight: 96,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    justifyContent: "space-between",
  },
  themeOptionActive: {
    borderColor: colors.red,
    backgroundColor: "#fff5f7",
  },
  themeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  themeIconActive: { backgroundColor: colors.pinkSoft },
  themeCopy: { marginTop: 8 },
  themeLabel: { fontSize: 13, fontWeight: "700", color: colors.ink },
  themeLabelActive: { color: colors.red },
  themeDetail: { fontSize: 10.5, color: colors.muted, marginTop: 2 },
  radio: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.red },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
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
  planCard: {
    marginBottom: spacing.md,
  },
  planBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planBadgeText: { fontSize: 11, fontWeight: "700" },
  perkIncluded: { fontSize: 12.5, color: colors.success, fontWeight: "700" },
  perkLocked: { fontSize: 11 },
  upgradeText: { fontSize: 12.5, color: colors.red, fontWeight: "700" },
  rowLabel: {
    fontSize: 13.5,
    color: colors.ink,
    flexShrink: 1,
  },
  rowValue: {
    fontSize: 13.5,
    color: colors.muted,
  },
  chevron: {
    fontSize: 18,
    color: colors.muted,
  },
  note: {
    marginTop: spacing.lg,
    textAlign: "center",
  },
});
