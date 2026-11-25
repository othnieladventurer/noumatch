import React from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { displayName, type UserProfile } from "../api/app";
import { colors, radius, spacing, useThemedStyles } from "../theme";
import { canSeeWhoLiked, planFor } from "../utils/accountAccess";

const SUPPORT_EMAIL = "support@noumatch.com";

export type AccountAnchor = {
  top: number;
  right: number;
};

type Props = {
  visible: boolean;
  user?: UserProfile | null;
  anchor?: AccountAnchor | null;
  onClose: () => void;
  onProfile: () => void;
  onSettings?: () => void;
  onLikes?: () => void;
  onSignOut: () => void;
};

/**
 * Mirrors the profile dropdown from DashboardNavbar.jsx: identity block + online dot,
 * plan badge, Mon profil, Contacter le support, divider, Déconnexion.
 */
export function AccountMenu({ visible, user, anchor, onClose, onProfile, onSettings, onLikes, onSignOut }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(baseStyles);
  const plan = planFor(user);
  const likesUnlocked = canSeeWhoLiked(user);
  const panelTop = anchor?.top ?? insets.top + 50;
  const panelRight = anchor?.right ?? 14;

  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        {/* Dismiss layer starts under the menu so the account avatar itself stays free. */}
        <Pressable
          style={[styles.backdrop, { top: panelTop }]}
          onPress={onClose}
          accessibilityLabel="Fermer le menu"
        />

        {/* Covers the navbar while open: a second tap on the account button — or
            anywhere else above the menu — closes the dropdown. */}
        <Pressable
          style={[styles.topArea, { height: panelTop }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer le menu du compte"
        />

        <Pressable
          style={[styles.panel, { top: panelTop, right: panelRight }]}
          onPress={(event) => event.stopPropagation()}
        >
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
          <Text style={[styles.planText, { color: plan.color }]}>{plan.badge}</Text>
        </View>
        <Text style={styles.planTagline}>{plan.tagline}</Text>

        <View style={styles.divider} />

        <Pressable
          style={[styles.item, styles.itemRow]}
          onPress={run(onLikes ?? (() => {}))}
          accessibilityRole="button"
          accessibilityLabel={likesUnlocked ? "Qui m’a liké" : "Qui m’a liké, réservé à Premium"}
        >
          <Text style={styles.itemText}>Qui m’a liké</Text>
          <Text style={styles.itemTrailing}>{likesUnlocked ? "❤️" : "🔒"}</Text>
        </Pressable>

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

const baseStyles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  topArea: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "transparent" },
  panel: {
    position: "absolute",
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
  name: { fontSize: 14, fontWeight: "700", color: colors.ink },
  email: { fontSize: 12, color: colors.muted, marginTop: 1 },
  online: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  onlineText: { fontSize: 11, color: "#4ade80" },
  plan: {
    marginHorizontal: spacing.md,
    marginBottom: 8,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
  },
  planText: { fontSize: 12, fontWeight: "700" },
  planTagline: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    marginTop: -4,
    marginBottom: 6,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  item: { paddingHorizontal: spacing.md, paddingVertical: 11 },
  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  itemText: { fontSize: 13.5, color: colors.ink },
  itemTrailing: { fontSize: 12 },
  danger: { fontSize: 13.5, color: "#DC2626", fontWeight: "600" },
});
