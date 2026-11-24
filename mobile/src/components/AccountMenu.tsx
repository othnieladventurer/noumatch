import React from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { displayName, type UserProfile } from "../api/app";
import { colors, radius, spacing } from "../theme";

const SUPPORT_EMAIL = "support@noumatch.com";

type Props = {
  visible: boolean;
  user?: UserProfile | null;
  onClose: () => void;
  onProfile: () => void;
  onSettings?: () => void;
  onSignOut: () => void;
};

function planLabel(accountType?: string) {
  switch ((accountType ?? "").toLowerCase()) {
    case "premium":
      return { text: "⭐ Compte Premium", background: "#F5B301", color: "#101D3A" };
    case "god_mode":
      return { text: "👑 God Mode", background: colors.red, color: colors.white };
    default:
      return { text: "Compte Gratuit", background: "#6B7280", color: colors.white };
  }
}

/**
 * Mirrors the profile dropdown from DashboardNavbar.jsx: identity block + online dot,
 * plan badge, Mon profil, Contacter le support, divider, Déconnexion.
 */
export function AccountMenu({ visible, user, onClose, onProfile, onSettings, onSignOut }: Props) {
  const insets = useSafeAreaInsets();
  const plan = planLabel(user?.account_type as string | undefined);

  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Dismiss layer starts below the navbar: no dark scrim, and the bell/inbox/avatar
            stay tappable while the menu is open, like the web dropdown. */}
        <Pressable
          style={[styles.backdrop, { top: insets.top + 56 }]}
          onPress={onClose}
          accessibilityLabel="Fermer le menu"
        />

        <Pressable style={[styles.panel, { top: insets.top + 50 }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.identity}>
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName(user)}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {typeof user?.email === "string" ? user.email : ""}
              </Text>
              <View style={styles.online}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>En ligne</Text>
              </View>
            </View>
          </View>

          <View style={[styles.plan, { backgroundColor: plan.background }]}>
            <Text style={[styles.planText, { color: plan.color }]}>{plan.text}</Text>
          </View>

          <View style={styles.divider} />

          <Pressable style={styles.item} onPress={run(onProfile)} accessibilityRole="button">
            <Text style={styles.itemText}>Mon profil</Text>
          </Pressable>

          <Pressable style={styles.item} onPress={run(onSettings ?? (() => {}))} accessibilityRole="button">
            <Text style={styles.itemText}>Paramètres</Text>
          </Pressable>

          <Pressable
            style={styles.item}
            onPress={run(() => {
              void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=NouMatch%20-%20Support`);
            })}
            accessibilityRole="button"
          >
            <Text style={styles.itemText}>Contacter le support</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.item} onPress={run(onSignOut)} accessibilityRole="button">
            <Text style={styles.danger}>Déconnexion</Text>
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  panel: {
    position: "absolute",
    right: 14,
    width: 280,
    maxWidth: "90%",
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  identity: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  identityText: { flex: 1 },
  name: { fontSize: 15.5, fontWeight: "700", color: colors.ink },
  email: { fontSize: 12.5, color: colors.muted, marginTop: 1 },
  online: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  onlineText: { fontSize: 11.5, color: "#4ade80" },
  plan: {
    marginHorizontal: spacing.md,
    marginBottom: 8,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
  },
  planText: { fontSize: 12.5, fontWeight: "700" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  item: { paddingHorizontal: spacing.md, paddingVertical: 11 },
  itemText: { fontSize: 14.5, color: colors.ink },
  danger: { fontSize: 14.5, color: "#DC2626", fontWeight: "600" },
});
