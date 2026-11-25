import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { fetchReceivedLikes, profilePhoto, type ReceivedLike } from "../api/app";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { canSeeWhoLiked, planFor } from "../utils/accountAccess";
import { colors, radius, spacing, useTheme, useThemedStyles, useTypography } from "../theme";
import { Button } from "./Button";
import { ProfileTile } from "./ProfileTile";

const SUPPORT_EMAIL = "support@noumatch.com";

type Props = {
  /** Section heading + plan pill, used when the panel is a home tab rather than a screen. */
  heading?: boolean;
  /** Adds page gutters when the panel is not already inside a padded Screen. */
  inset?: boolean;
};

/**
 * "Qui m'a liké" content, shared by the /likes screen and the Premium/God Mode
 * home tab. Free accounts get the count plus blurred previews; Premium and God
 * Mode see the profiles the web dashboard shows.
 */
export function LikesPanel({ heading = false, inset = false }: Props) {
  const { user, status } = useAuth();
  const styles = useThemedStyles(baseStyles);
  const type = useTypography();
  const { colors: theme } = useTheme();
  const unlocked = canSeeWhoLiked(user);
  const plan = planFor(user);

  const [likes, setLikes] = useState<ReceivedLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const received = await fetchReceivedLikes();
      setLikes(received);
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible de charger les likes reçus."));
      setLikes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "signedIn") return;
    let cancelled = false;

    (async () => {
      try {
        const received = await fetchReceivedLikes();
        if (cancelled) return;
        setLikes(received);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(apiErrorMessage(err, "Impossible de charger les likes reçus."));
        setLikes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  const openProfile = (like: ReceivedLike) => {
    if (!like.from_user) return;
    router.push(`/profile/${like.from_user.id}`);
  };

  const count = likes.length;
  const label = count === 1 ? "personne t'a liké" : "personnes t'ont liké";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.red} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={[styles.bodyContent, inset && styles.bodyInset]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={theme.red}
        />
      }
    >
      {heading ? (
        <View style={styles.heading}>
          <Text style={[type.h1, styles.headingTitle]}>Qui m’a liké</Text>
          <View
            style={[styles.planPill, { backgroundColor: plan.background, borderColor: plan.background }]}
          >
            <Text style={[styles.planPillText, { color: plan.color }]}>
              {plan.icon ? `${plan.icon} ` : ""}
              {plan.name}
            </Text>
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!unlocked ? (
        <View style={styles.lockedCard}>
          <Text style={styles.lockedTitle}>Qui t’a liké ?</Text>
          <Text style={styles.lockedCount}>
            {count > 0 ? `${count} ${label}` : "Personne ne t’a liké pour l’instant"}
          </Text>

          {count > 0 ? (
            <View style={styles.blurRow}>
              {likes.slice(0, 4).map((like) => {
                const uri = profilePhoto(like.from_user);
                return uri ? (
                  <Image key={like.id} source={{ uri }} style={styles.blurAvatar} blurRadius={16} />
                ) : (
                  <View key={like.id} style={[styles.blurAvatar, styles.blurFallback]} />
                );
              })}
              {count > 4 ? (
                <View style={[styles.blurAvatar, styles.blurMore]}>
                  <Text style={styles.blurMoreText}>+{count - 4}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.lockedCopy}>
            Premium débloque la liste complète : vois qui s’intéresse à toi et matche
            directement depuis son profil.
          </Text>

          <View style={styles.perks}>
            {plan.perks.map((perk) => (
              <Text key={perk.label} style={styles.perk}>
                {perk.included ? "✓" : "🔒"} {perk.label}
              </Text>
            ))}
          </View>

          <Button
            title="Passer à Premium"
            onPress={() => {
              void Linking.openURL(
                `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("NouMatch — Passage à Premium")}`,
              );
            }}
          />
        </View>
      ) : count === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>💜</Text>
          <Text style={styles.emptyTitle}>Aucun like pour l’instant</Text>
          <Text style={styles.emptyCopy}>
            Quand quelqu’un te like, son profil apparaît ici.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.muted}>
            {count} {label}
          </Text>
          <View style={styles.grid}>
            {likes.map((like) =>
              like.from_user ? (
                <View key={like.id} style={styles.cell}>
                  <ProfileTile profile={like.from_user} onPress={() => openProfile(like)} />
                  {like.type === "coup_de_coeur" ? (
                    <View style={styles.coeurBadge}>
                      <Text style={styles.coeurBadgeText}>💜 Coup de cœur</Text>
                    </View>
                  ) : null}
                </View>
              ) : null,
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const baseStyles = StyleSheet.create({
  body: { flex: 1 },
  bodyContent: { paddingBottom: spacing.xl, paddingTop: spacing.xs },
  bodyInset: { paddingHorizontal: 20 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headingTitle: { flexShrink: 1 },
  planPill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planPillText: { fontSize: 11, fontWeight: "700" },
  center: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: spacing.xl },
  muted: { fontSize: 13, color: colors.muted, marginBottom: spacing.sm },
  error: { color: colors.red, fontSize: 12.5, marginBottom: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell: { width: "48%", flexGrow: 1, position: "relative" },
  coeurBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.purple,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  coeurBadgeText: { color: colors.white, fontSize: 10, fontWeight: "700" },
  lockedCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  lockedTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
  lockedCount: { fontSize: 13.5, color: colors.muted },
  blurRow: { flexDirection: "row", gap: 10, justifyContent: "center" },
  blurAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.creamDeep,
    borderWidth: 2,
    borderColor: colors.white,
  },
  blurFallback: { backgroundColor: "#D9D2CE" },
  blurMore: { alignItems: "center", justifyContent: "center", backgroundColor: colors.creamDeep },
  blurMoreText: { fontSize: 12, fontWeight: "700", color: colors.red },
  lockedCopy: { fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: "center" },
  perks: { alignSelf: "stretch", gap: 6 },
  perk: { fontSize: 12.5, color: colors.inkSoft },
  emptyIcon: { fontSize: 30 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, textAlign: "center" },
  emptyCopy: { fontSize: 13, color: colors.muted, textAlign: "center", maxWidth: 280 },
});
