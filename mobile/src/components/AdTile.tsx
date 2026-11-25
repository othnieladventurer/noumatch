import { router } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { AdCampaign } from "../ads/campaigns";
import { useThemedStyles } from "../theme";

type Props = {
  campaign: AdCampaign;
  single?: boolean;
};

/** A clearly labelled sponsored card that occupies one profile slot. */
export function AdTile({ campaign, single = false }: Props) {
  const styles = useThemedStyles(baseStyles);

  return (
    <Pressable
      onPress={() => router.push(`/ad/${campaign.id}`)}
      style={[styles.tile, single && styles.tileSingle]}
      accessibilityRole="button"
      accessibilityLabel={`Publicité ${campaign.sponsor} : ${campaign.title.replace(/\n/g, " ")}`}
    >
      <Image source={campaign.images[0].source} style={styles.photo} resizeMode="cover" />
      <Image source={require("../../assets/brand/card-fade.png")} style={styles.fade} resizeMode="stretch" />

      <View style={styles.topRow}>
        <View style={styles.sponsorPill}>
          <Text style={styles.sponsorText}>Sponsorisé</Text>
        </View>
        <View style={[styles.accent, { backgroundColor: campaign.accent }]} />
      </View>

      <View style={styles.info}>
        <Text style={styles.category}>{campaign.category}</Text>
        <Text style={[styles.title, single && styles.titleSingle]} numberOfLines={3}>
          {campaign.title}
        </Text>
        <Text style={styles.cta}>Découvrir →</Text>
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
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tileSingle: {
    aspectRatio: 4 / 3,
  },
  photo: { width: "100%", height: "100%" },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: "72%" },
  topRow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sponsorPill: {
    backgroundColor: "rgba(0,0,0,0.58)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sponsorText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  accent: { width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.75)" },
  info: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingVertical: 12, gap: 3 },
  category: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: { color: "#fff", fontSize: 14, lineHeight: 17, fontWeight: "800", letterSpacing: -0.2 },
  titleSingle: { fontSize: 22, lineHeight: 26 },
  cta: { color: "#fff", fontSize: 10.5, fontWeight: "700", marginTop: 4, opacity: 0.92 },
});
