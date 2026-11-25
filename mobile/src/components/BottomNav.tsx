import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { displayName, profilePhoto, type UserProfile } from "../api/app";
import { canSeeWhoLiked, planFor } from "../utils/accountAccess";
import { colors, useTheme, useThemedStyles } from "../theme";

export type NavTab = "discover" | "likes" | "conversations" | "me";

type Props = {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  unread?: number;
  user?: UserProfile | null;
};

/**
 * Mirrors `.mobile-bottom-nav` from the web dashboard: white bar, icons and the
 * profile photo on "Moi". Premium and God Mode get the Likes tab (their
 * "Qui m'a liké" access); free accounts keep three items and reach the locked
 * upsell from the account menu. The avatar carries the plan badge.
 */
export function BottomNav({ active, onChange, unread = 0, user }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(baseStyles);
  const photo = profilePhoto(user);
  const plan = planFor(user);

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 6 }]}>
      <Item
        label="Découvrir"
        icon={require("../../assets/brand/icon-compass.png")}
        active={active === "discover"}
        onPress={() => onChange("discover")}
      />

      {canSeeWhoLiked(user) ? (
        <Item
          label="Likes"
          glyph="♥"
          active={active === "likes"}
          onPress={() => onChange("likes")}
          accessibilityLabel="Qui m’a liké"
        />
      ) : null}

      <Item
        label="Conversations"
        icon={require("../../assets/brand/icon-chat.png")}
        active={active === "conversations"}
        onPress={() => onChange("conversations")}
        badge={unread}
      />

      <Item
        label="Moi"
        photoUrl={photo}
        initials={`${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase()}
        active={active === "me"}
        onPress={() => onChange("me")}
        accessibilityLabel={`Moi, ${displayName(user)}`}
        planIcon={plan.tier === "free" ? undefined : plan.icon}
      />
    </View>
  );
}

type ItemProps = {
  label: string;
  icon?: number;
  glyph?: string;
  photoUrl?: string | null;
  initials?: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
  accessibilityLabel?: string;
  planIcon?: string;
};

function Item({
  label,
  icon,
  glyph,
  photoUrl,
  initials,
  active,
  onPress,
  badge = 0,
  accessibilityLabel,
  planIcon,
}: ItemProps) {
  const styles = useThemedStyles(baseStyles);
  const { colors: theme } = useTheme();
  const tint = active ? theme.redText : theme.muted;

  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <View style={styles.iconSlot}>
        {glyph ? (
          <Text style={[styles.glyph, { color: tint }]}>{glyph}</Text>
        ) : icon !== undefined ? (
          <Image source={icon} style={[styles.icon, { tintColor: tint }]} resizeMode="contain" />
        ) : photoUrl ? (
          <Image source={{ uri: photoUrl }} style={[styles.avatar, active && styles.avatarActive]} />
        ) : (
          <View style={[styles.avatarFallback, active && styles.avatarActive]}>
            <Text style={[styles.avatarInitials, active && styles.avatarInitialsActive]}>{initials || "N"}</Text>
          </View>
        )}

        {badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
          </View>
        ) : null}

        {planIcon ? (
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{planIcon}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.label, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const baseStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 9,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  iconSlot: {
    width: 28,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 22,
    height: 22,
  },
  glyph: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "700",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarActive: {
    borderWidth: 1.5,
    borderColor: colors.red,
  },
  avatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.creamDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted,
  },
  avatarInitialsActive: {
    color: colors.red,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
  planBadge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    zIndex: 2,
    elevation: 2,
  },
  planBadgeText: { fontSize: 11, lineHeight: 13 },
});
