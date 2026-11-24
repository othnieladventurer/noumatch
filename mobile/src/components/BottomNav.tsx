import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { displayName, profilePhoto, type UserProfile } from "../api/app";
import { colors } from "../theme";

export type NavTab = "discover" | "conversations" | "me";

type Props = {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  unread?: number;
  user?: UserProfile | null;
};

/**
 * Mirrors `.mobile-bottom-nav` from the web dashboard: white bar, three items
 * (Découvrir · Conversations · Moi) with icons, the profile photo on "Moi",
 * and an unread badge on Conversations.
 */
export function BottomNav({ active, onChange, unread = 0, user }: Props) {
  const insets = useSafeAreaInsets();
  const photo = profilePhoto(user);

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 6 }]}>
      <Item
        label="Découvrir"
        icon={require("../../assets/brand/icon-compass.png")}
        active={active === "discover"}
        onPress={() => onChange("discover")}
      />

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
      />
    </View>
  );
}

type ItemProps = {
  label: string;
  icon?: number;
  photoUrl?: string | null;
  initials?: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
  accessibilityLabel?: string;
};

function Item({ label, icon, photoUrl, initials, active, onPress, badge = 0, accessibilityLabel }: ItemProps) {
  const tint = active ? colors.red : colors.muted;

  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <View style={styles.iconSlot}>
        {icon !== undefined ? (
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
      </View>

      <Text style={[styles.label, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 11.5,
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
    fontSize: 9.5,
    fontWeight: "700",
  },
});
