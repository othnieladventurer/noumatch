import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { LikesPanel } from "../components/LikesPanel";
import { Screen } from "../components/Screen";
import { planFor } from "../utils/accountAccess";
import { colors, radius, spacing, useThemedStyles } from "../theme";

/**
 * Standalone "Qui m'a liké" route, used for the free-account upsell and deep
 * links. Premium/God Mode reach the same content as a home tab.
 */
export default function LikesScreen() {
  const { user } = useAuth();
  const plan = planFor(user);
  const styles = useThemedStyles(baseStyles);

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
          Qui m’a liké
        </Text>
        <View
          style={[styles.planPill, { backgroundColor: plan.background, borderColor: plan.background }]}
        >
          <Text style={[styles.planPillText, { color: plan.color }]}>
            {plan.icon ? `${plan.icon} ` : ""}
            {plan.name}
          </Text>
        </View>
      </View>

      <LikesPanel />
    </Screen>
  );
}

const baseStyles = StyleSheet.create({
  screen: { paddingTop: spacing.xs },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backGlyph: { fontSize: 20, color: colors.ink },
  pressed: { opacity: 0.6 },
  title: { flex: 1, fontSize: 17, fontWeight: "700", color: colors.ink },
  planPill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planPillText: { fontSize: 11, fontWeight: "700" },
});
