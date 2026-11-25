import { router } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { profilePhoto, type UserProfile } from "../api/app";
import { useThemedStyles } from "../theme";

type Props = { profile: UserProfile; onPress?: () => void };

/**
 * Port of `ProfileCard` in frontend/src/components/DiscoveryGrid.jsx — same values:
 * aspect-ratio 3/4, radius 16, #1A1A2E fallback, bottom 55% black gradient (to 0.88),
 * verified chip top-right, name + ", age" at 0.92rem/700 and city at 0.72rem/0.82.
 */
export function ProfileTile({ profile, onPress }: Props) {
  const styles = useThemedStyles(baseStyles);
  const uri = profilePhoto(profile);
  const city = profile.location?.trim() || profile.city?.trim() || "";
  const initial = (profile.first_name || "?").charAt(0).toUpperCase();

  return (
    <Pressable
      style={styles.tile}
      onPress={onPress ?? (() => router.push(`/profile/${profile.id}`))}
      accessibilityRole="button"
      accessibilityLabel={`${profile.first_name ?? "Profil"}${profile.age ? `, ${profile.age}` : ""}`}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.initial}>{initial}</Text>
        </View>
      )}

      <Image source={require("../../assets/brand/card-fade.png")} style={styles.fade} resizeMode="stretch" />

      {profile.is_verified ? (
        <View style={styles.verified}>
          <Text style={styles.verifiedText}>✓ Vérifié</Text>
        </View>
      ) : null}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {profile.first_name}
          {profile.age ? `, ${profile.age}` : ""}
        </Text>
        {city ? (
          <Text style={styles.city} numberOfLines={1}>
            📍 {city}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const baseStyles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1A1A2E",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  photo: { width: "100%", height: "100%" },
  fallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1A2E",
  },
  initial: { fontSize: 32, fontWeight: "700", color: "#FF2D55", letterSpacing: -1 },
  // gradient overlay: bottom 55%, rgba(0,0,0,0.88) -> transparent
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: "55%" },
  verified: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedText: { fontSize: 10, fontWeight: "700", color: "#4ade80" },
  info: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingVertical: 10 },
  name: { color: "#fff", fontWeight: "700", fontSize: 13.5, lineHeight: 16 },
  city: { color: "#fff", opacity: 0.82, fontSize: 11, marginTop: 2 },
});
