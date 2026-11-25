import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { findCampaign } from "../../ads/campaigns";
import { AppChrome } from "../../components/AppChrome";
import { useTheme, useThemedStyles } from "../../theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function ContactRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(baseStyles);
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}
      accessibilityRole="link"
      accessibilityLabel={`${label} : ${value}`}
    >
      <View style={styles.contactIcon}>
        <Ionicons name={icon} size={17} color={colors.redText} />
      </View>
      <View style={styles.contactCopy}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue} numberOfLines={1}>
          {value.replace(/^mailto:/, "").replace(/^https?:\/\//, "")}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={colors.muted} />
    </Pressable>
  );
}

/** Full campaign page reached from a sponsored discovery card. */
export default function AdDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const campaign = findCampaign(id);
  const { width } = useWindowDimensions();
  const styles = useThemedStyles(baseStyles);
  const { colors } = useTheme();
  const [imageIndex, setImageIndex] = useState(0);

  if (!campaign) {
    return (
      <AppChrome active="discover">
        <View style={styles.missing}>
          <Text style={styles.missingIcon}>📣</Text>
          <Text style={styles.missingTitle}>Cette annonce n’est plus disponible.</Text>
          <Pressable onPress={() => router.back()} style={styles.missingButton} accessibilityRole="button">
            <Text style={styles.missingButtonText}>Retour à Découvrir</Text>
          </Pressable>
        </View>
      </AppChrome>
    );
  }

  const heroHeight = Math.min(460, Math.round(width * 1.08));
  const open = (url: string) => {
    void Linking.openURL(url).catch(() => undefined);
  };

  return (
    <AppChrome active="discover">
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const next = Math.round(event.nativeEvent.contentOffset.x / width);
              setImageIndex(Math.max(0, Math.min(next, campaign.images.length - 1)));
            }}
          >
            {campaign.images.map((image) => (
              <Image
                key={image.caption}
                source={image.source}
                style={[styles.heroImage, { width, height: heroHeight }]}
                resizeMode="cover"
                accessibilityLabel={image.caption}
              />
            ))}
          </ScrollView>

          <Image source={require("../../../assets/brand/card-fade.png")} style={styles.heroFade} resizeMode="stretch" />

          <View style={styles.heroTop} pointerEvents="box-none">
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Retour"
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={19} color={colors.ink} />
            </Pressable>
            <View style={styles.sponsoredPill}>
              <View style={styles.sponsoredDot} />
              <Text style={styles.sponsoredText}>Sponsorisé</Text>
            </View>
          </View>

          {campaign.images.length > 1 ? (
            <View style={styles.dots} pointerEvents="none">
              {campaign.images.map((image, index) => (
                <View key={image.caption} style={[styles.dot, index === imageIndex && styles.dotActive]} />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={[styles.accentRule, { backgroundColor: campaign.accent }]} />
          <Text style={styles.kicker}>
            {campaign.category} · {campaign.sponsor}
          </Text>
          <Text style={styles.title}>{campaign.title}</Text>
          <Text style={styles.tagline}>{campaign.tagline}</Text>

          {campaign.images[imageIndex]?.caption ? (
            <Text style={styles.caption}>{campaign.images[imageIndex].caption}</Text>
          ) : null}

          <View style={styles.divider} />

          {campaign.description.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}

          <View style={styles.offer}>
            <Text style={styles.offerLabel}>En savoir plus</Text>
            <Text style={styles.offerTitle}>{campaign.cta.label}</Text>
            <Pressable
              onPress={() => open(campaign.cta.url)}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: campaign.accent },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={campaign.cta.label}
            >
              <Text style={styles.primaryButtonText}>{campaign.cta.label}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </Pressable>
          </View>

          {campaign.contact ? (
            <>
              <Text style={styles.sectionLabel}>Contact</Text>
              <View style={styles.contactCard}>
                {campaign.contact.website ? (
                  <ContactRow
                    icon="globe-outline"
                    label="Site web"
                    value={campaign.contact.website}
                    onPress={() => open(campaign.contact!.website!)}
                  />
                ) : null}
                {campaign.contact.email ? (
                  <ContactRow
                    icon="mail-outline"
                    label="Email"
                    value={campaign.contact.email}
                    onPress={() => open(`mailto:${campaign.contact!.email}`)}
                  />
                ) : null}
                {campaign.contact.phone ? (
                  <ContactRow
                    icon="call-outline"
                    label="Téléphone"
                    value={campaign.contact.phone}
                    onPress={() => open(`tel:${campaign.contact!.phone}`)}
                  />
                ) : null}
                <ContactRow
                  icon="share-social-outline"
                  label="Partager"
                  value="Envoyer cette annonce"
                  onPress={() =>
                    void Share.share({
                      message: `${campaign.title.replace(/\n/g, " ")} — ${campaign.cta.url}`,
                    })
                  }
                />
              </View>
            </>
          ) : null}

          <View style={styles.disclosure}>
            <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
            <Text style={styles.disclosureText}>
              Annonce commerciale de {campaign.sponsor}. Les contenus sponsorisés sont clairement
              identifiés et n’influencent pas votre classement dans Découvrir.
            </Text>
          </View>
        </View>
      </ScrollView>
    </AppChrome>
  );
}

const baseStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f5f7fb" },
  scroll: { paddingBottom: 36 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 10 },
  missingIcon: { fontSize: 34 },
  missingTitle: { fontSize: 16, fontWeight: "700", color: "#212529", textAlign: "center" },
  missingButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#dc3545",
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  missingButtonText: { color: "#dc3545", fontWeight: "700", fontSize: 12.5 },

  hero: { width: "100%", backgroundColor: "#1A1A2E", overflow: "hidden" },
  heroImage: { backgroundColor: "#1A1A2E" },
  heroFade: { position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: "45%" },
  heroTop: {
    position: "absolute",
    top: 12,
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  sponsoredPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.58)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sponsoredDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" },
  sponsoredText: {
    color: "#fff",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  dots: { position: "absolute", bottom: 16, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 5 },
  dot: { width: 14, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.45)" },
  dotActive: { width: 24, backgroundColor: "#fff" },

  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  accentRule: { width: 42, height: 4, borderRadius: 2, marginBottom: 14 },
  kicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6c757d",
    marginBottom: 8,
  },
  title: { fontSize: 26, lineHeight: 30, fontWeight: "800", letterSpacing: -0.7, color: "#101D3A" },
  tagline: { fontSize: 14, lineHeight: 21, color: "#6c757d", marginTop: 8 },
  caption: { fontSize: 10.5, color: "#8a8f98", marginTop: 10, fontStyle: "italic" },
  divider: { height: 1, backgroundColor: "#EAE4E1", marginVertical: 20 },
  paragraph: { fontSize: 13.5, lineHeight: 21.5, color: "#4a4a4a", marginBottom: 12 },

  offer: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#ffd8df",
    backgroundColor: "#fff5f7",
    borderRadius: 18,
    padding: 16,
  },
  offerLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#D41455",
  },
  offerTitle: { fontSize: 17, fontWeight: "800", color: "#101D3A", marginTop: 4, letterSpacing: -0.3 },
  primaryButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  sectionLabel: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "#6c757d",
  },
  contactCard: {
    borderWidth: 1,
    borderColor: "#EAE4E1",
    borderRadius: 16,
    overflow: "hidden",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EEE8",
  },
  contactIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
  },
  contactCopy: { flex: 1, minWidth: 0 },
  contactLabel: { fontSize: 12.5, fontWeight: "600", color: "#101D3A" },
  contactValue: { fontSize: 11, color: "#6c757d", marginTop: 1 },
  pressed: { opacity: 0.7 },

  disclosure: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#f8f9fa",
    borderRadius: 14,
    padding: 12,
    marginTop: 20,
    marginBottom: 12,
  },
  disclosureText: { flex: 1, fontSize: 10.5, lineHeight: 15.5, color: "#6c757d" },
});
