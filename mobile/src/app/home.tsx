import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  displayName,
  fetchConversations,
  fetchMatches,
  fetchNotifications,
  fetchProfilesPage,
  fetchUnreadCount,
  profilePhoto,
  relativeTime,
  type Conversation,
  type UserProfile,
} from "../api/app";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { Alert } from "../components/Alert";
import { BottomNav, type NavTab } from "../components/BottomNav";
import { Button } from "../components/Button";
import { LikesPanel } from "../components/LikesPanel";
import { ProfileTile } from "../components/ProfileTile";
import { TopNav } from "../components/TopNav";
import { AdTile } from "../components/AdTile";
import { buildDiscoveryFeed } from "../ads/campaigns";
import { colors, radius, spacing, useTheme, useThemedStyles, useTypography } from "../theme";
import { canSeeWhoLiked, planFor } from "../utils/accountAccess";

function Avatar({ profile, size = 42 }: { profile?: UserProfile | null; size?: number }) {
  const styles = useThemedStyles(baseStyles);
  const uri = profilePhoto(profile);
  const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase();

  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarInitials}>{initials || "N"}</Text>
    </View>
  );
}

/**
 * Authenticated app shell — mirrors the web dashboard at phone width:
 * `.nm-navbar` (logo · bell · messages · avatar menu), DiscoveryGrid for Découvrir,
 * and `.mobile-bottom-nav` (Découvrir · Conversations · Moi).
 */
export default function HomeScreen() {
  const { user, status, signOut } = useAuth();
  const styles = useThemedStyles(baseStyles);
  const type = useTypography();
  const { colors: theme } = useTheme();
  const me = user as unknown as UserProfile | undefined;
  const plan = planFor(me);
  const likesUnlocked = canSeeWhoLiked(me);

  const [tab, setTab] = useState<NavTab>("discover");
  // Detail screens keep the bottom nav and send the user back to a specific tab.
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [apiError, setApiError] = useState("");
  const [matches, setMatches] = useState<UserProfile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unread, setUnread] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [columns, setColumns] = useState<1 | 2>(2);
  const [feedSeed, setFeedSeed] = useState(() => Math.floor(Math.random() * 2147483647));

  const loadFeed = useCallback(async () => {
    setLoadingFeed(true);
    setApiError("");
    try {
      const { profiles: list, hasNext: more } = await fetchProfilesPage(1);
      setProfiles(list);
      setPage(1);
      setHasNext(more);
    } catch (error) {
      setApiError(apiErrorMessage(error, "Impossible de charger les profils."));
      setProfiles([]);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { profiles: list, hasNext: more } = await fetchProfilesPage(next);
      setProfiles((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...list.filter((item) => !seen.has(item.id))];
      });
      setPage(next);
      setHasNext(more);
    } catch {
      // keep the current page; the button stays available
    } finally {
      setLoadingMore(false);
    }
  };

  const loadConversations = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([fetchConversations(), fetchUnreadCount()]);
      setConversations(list);
      setUnread(count);
    } catch {
      setConversations([]);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const list = await fetchNotifications();
      setNotificationUnread(list.filter((item) => !item.is_read).length);
    } catch {
      setNotificationUnread(0);
    }
  }, []);

  const loadMatches = useCallback(async () => {
    try {
      setMatches(await fetchMatches(me?.id));
    } catch {
      setMatches([]);
    }
  }, [me?.id]);

  useEffect(() => {
    if (status !== "signedIn") return;
    void loadFeed();
    void loadConversations();
    void loadMatches();
  }, [status, loadFeed, loadConversations, loadMatches]);

  useEffect(() => {
    if (tabParam === "discover" || tabParam === "conversations" || tabParam === "me") setTab(tabParam);
    else if (tabParam === "likes" && likesUnlocked) setTab("likes");
  }, [tabParam, likesUnlocked]);

  useFocusEffect(
    useCallback(() => {
      if (status !== "signedIn") return;
      void loadNotifications();
      void loadConversations();
    }, [status, loadNotifications, loadConversations]),
  );

  const refreshAll = async () => {
    setRefreshing(true);
    setFeedSeed(Math.floor(Math.random() * 2147483647));
    await Promise.all([loadFeed(), loadConversations(), loadMatches(), loadNotifications()]);
    setRefreshing(false);
  };

  // Premium/God Mode get the tab; free accounts get the locked upsell screen.
  const openLikes = () => {
    if (likesUnlocked) setTab("likes");
    else router.push("/likes");
  };

  const feed = useMemo(() => buildDiscoveryFeed(profiles, feedSeed), [profiles, feedSeed]);

  if (status === "signedOut") return <Redirect href="/" />;

  const empty = !loadingFeed && profiles.length === 0;
  const discoveryHeader = (
    <View style={styles.discoverHeader}>
      <View style={styles.discoverHeading}>
        <Text style={[type.h1, styles.discoverTitle]}>Découvrir</Text>
        <Text style={styles.discoverSub}>
          {profiles.length} profil{profiles.length > 1 ? "s" : ""} près de vous
        </Text>
      </View>

      <View style={styles.viewSwitch} accessibilityLabel="Disposition des profils">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Afficher un profil à la fois"
          accessibilityState={{ selected: columns === 1 }}
          onPress={() => setColumns(1)}
          style={[styles.viewButton, columns === 1 && styles.viewButtonActive]}
        >
          <Ionicons name="square-outline" size={17} color={columns === 1 ? theme.redText : theme.muted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Afficher la grille de profils"
          accessibilityState={{ selected: columns === 2 }}
          onPress={() => setColumns(2)}
          style={[styles.viewButton, columns === 2 && styles.viewButtonActive]}
        >
          <Ionicons name="grid" size={16} color={columns === 2 ? theme.redText : theme.muted} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <TopNav
        user={me}
        unread={unread}
        notificationUnread={notificationUnread}
        onMessages={() => setTab("conversations")}
        onNotifications={() => router.push("/notifications")}
        onProfile={() => setTab("me")}
        onSettings={() => router.push("/settings")}
        onLikes={openLikes}
        onSignOut={() => void signOut()}
      />

      <View style={styles.body}>
        {tab === "discover" ? (
          loadingFeed && profiles.length === 0 ? (
            <View style={styles.feedLoading}>
              <ActivityIndicator color={theme.red} />
            </View>
          ) : empty ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💜</Text>
              <Text style={styles.emptyTitle}>Tu as découvert tout le monde pour l’instant</Text>
              <Text style={styles.emptyCopy}>
                NouMatch grandit chaque jour en Haïti. De nouveaux profils arrivent régulièrement.
              </Text>
              <Text style={styles.emptyCopy}>En attendant, invite tes amis pour agrandir la communauté !</Text>
              <View style={styles.emptyActions}>
                <Button
                  title="Rafraîchir"
                  variant="ghost"
                  onPress={() => void refreshAll()}
                  style={styles.emptyButton}
                />
              </View>
              {apiError ? <Text style={styles.errorText}>{apiError}</Text> : null}
            </View>
          ) : (
            <FlatList
              key={`discovery-${columns}`}
              data={feed}
              keyExtractor={(item) => item.key}
              numColumns={columns}
              columnWrapperStyle={columns > 1 ? styles.column : undefined}
              contentContainerStyle={styles.grid}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={theme.red} />}
              ListHeaderComponent={
                <>
                  {discoveryHeader}
                  {apiError ? <Alert>{apiError}</Alert> : null}
                </>
              }
              renderItem={({ item }) =>
                item.kind === "ad" ? (
                  <AdTile campaign={item.ad} single={columns === 1} />
                ) : (
                  <ProfileTile profile={item.profile} />
                )
              }
              ListFooterComponent={
                <View style={styles.footer}>
                  {loadingMore ? <ActivityIndicator color={theme.red} /> : null}
                  {!loadingMore && hasNext ? (
                    <Pressable onPress={() => void loadMore()} style={styles.moreButton} accessibilityRole="button">
                      <Text style={styles.moreText}>Voir plus</Text>
                    </Pressable>
                  ) : null}
                </View>
              }
            />
          )
        ) : null}

        {tab === "likes" ? <LikesPanel heading inset /> : null}

        {tab === "conversations" ? (
          <FlatList
            data={conversations}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.flatList, conversations.length === 0 && styles.flatListEmpty]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={theme.red} />}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={[type.h1, styles.listTitle]}>Conversations</Text>
                <Text style={styles.muted}>
                  {unread > 0 ? `${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}` : "À jour"}
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyTitle}>Pas encore de conversations</Text>
                <Text style={styles.muted}>Quand vous matchez avec quelqu’un, la discussion apparaît ici.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Avatar profile={item.other_user} />
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {displayName(item.other_user)}
                    </Text>
                    <Text style={styles.rowTime}>{relativeTime(item.last_message?.created_at)}</Text>
                  </View>
                  <Text style={styles.rowText} numberOfLines={1}>
                    {item.last_message?.content ?? "Démarrer une conversation"}
                  </Text>
                </View>
                {(item.unread_count ?? 0) > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread_count}</Text>
                  </View>
                ) : null}
              </View>
            )}
          />
        ) : null}

        {tab === "me" ? (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.profileHeader}>
              <Avatar profile={me} size={96} />
              <Text style={[type.h1, styles.profileName]} numberOfLines={1}>
                {displayName(me)}
              </Text>
              <Text style={styles.muted}>{typeof user?.email === "string" ? user.email : ""}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{matches.length}</Text>
                <Text style={styles.statLabel}>Matchs</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{conversations.length}</Text>
                <Text style={styles.statLabel}>Conversations</Text>
              </View>
            </View>

            <Pressable
              onPress={() => router.push("/settings")}
              style={styles.planRow}
              accessibilityRole="button"
              accessibilityLabel={`Mon abonnement : ${plan.name}`}
            >
              <View style={[styles.planBadge, { backgroundColor: plan.background }]}>
                <Text style={[styles.planBadgeText, { color: plan.color }]}>{plan.badge}</Text>
              </View>
              <Text style={styles.planHint} numberOfLines={1}>
                {plan.tier === "free" ? "Découvrir Premium" : plan.tagline}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            <Pressable
              onPress={openLikes}
              style={[styles.linkRow, styles.linkRowSpaced]}
              accessibilityRole="button"
              accessibilityLabel={likesUnlocked ? "Qui m'a liké" : "Qui m'a liké, réservé à Premium"}
            >
              <Text style={styles.linkLabel}>Qui m’a liké</Text>
              <Text style={styles.linkIcon}>{likesUnlocked ? "❤️" : "🔒"}</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/profile")} style={[styles.linkRow, styles.linkRowSpaced]} accessibilityRole="button">
              <Text style={styles.linkLabel}>Modifier mon profil</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/messages")}
              style={[styles.linkRow, { marginTop: 10 }]}
              accessibilityRole="button"
            >
              <Text style={styles.linkLabel}>Mes messages</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/settings")} style={[styles.linkRow, { marginTop: 10 }]} accessibilityRole="button">
              <Text style={styles.linkLabel}>Paramètres</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            <View style={styles.meActions}>
              <Button title="Se déconnecter" variant="ghost" onPress={signOut} />
            </View>
          </ScrollView>
        ) : null}
      </View>

      <BottomNav active={tab} onChange={setTab} unread={unread} user={me} />
    </View>
  );
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f7fb" },
  body: { flex: 1, backgroundColor: "#f5f7fb" },

  // ── DiscoveryGrid (frontend/src/components/DiscoveryGrid.jsx) ──────────────
  feedLoading: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 240, backgroundColor: "#f5f7fb" },
  grid: { padding: 12, gap: 12, backgroundColor: "#f5f7fb" },
  column: { gap: 12 },
  discoverHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: spacing.sm,
  },
  discoverHeading: { flex: 1 },
  discoverTitle: { fontSize: 22 },
  discoverSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  viewSwitch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  viewButton: {
    width: 34,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  viewButtonActive: { backgroundColor: "#fff0f3" },
  footer: { paddingVertical: 20, alignItems: "center", gap: 12 },
  moreButton: {
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: 999,
    paddingHorizontal: 36,
    paddingVertical: 9,
  },
  moreText: { color: colors.red, fontWeight: "600", fontSize: 12.5 },

  // Empty state: background #FFF0F3, 3.5rem heart, 300px copy column
  emptyState: {
    flex: 1,
    backgroundColor: "#FFF0F3",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 14 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: 12,
  },
  emptyCopy: {
    fontSize: 12.5,
    lineHeight: 21,
    opacity: 0.75,
    color: "#1a1a2e",
    textAlign: "center",
    maxWidth: 300,
    marginBottom: 6,
  },
  emptyActions: { marginTop: 22, width: "100%", maxWidth: 280, gap: 12 },
  emptyButton: { alignSelf: "stretch" },
  errorText: { marginTop: 12, fontSize: 12, color: colors.red, textAlign: "center" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: spacing.xl },
  muted: { fontSize: 12.5, color: colors.muted, textAlign: "center", lineHeight: 18.5 },
  avatarFallback: { backgroundColor: colors.creamDeep, alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontWeight: "800", color: colors.red, fontSize: 14 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: spacing.md, paddingBottom: spacing.lg },
  flatList: { paddingHorizontal: 20, paddingTop: spacing.md, paddingBottom: spacing.lg },
  flatListEmpty: { flexGrow: 1 },
  listHeader: { marginBottom: spacing.md, gap: 2 },
  listTitle: { marginBottom: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 10,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowName: { flex: 1, fontSize: 13.5, fontWeight: "700", color: colors.ink },
  rowTime: { fontSize: 11, color: colors.placeholder },
  rowText: { fontSize: 12.5, color: colors.muted },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  profileHeader: { alignItems: "center", gap: 6, marginTop: spacing.lg, marginBottom: spacing.lg },
  profileName: { textAlign: "center" },
  statCard: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.ink },
  statLabel: { fontSize: 11, color: colors.muted },
  statDivider: { width: 1, backgroundColor: colors.border },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 54,
  },
  linkRowSpaced: { marginTop: 10 },
  linkLabel: { fontSize: 13.5, color: colors.ink },
  linkIcon: { fontSize: 12.5 },
  chevron: { fontSize: 18, color: colors.muted },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 54,
  },
  planBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planBadgeText: { fontSize: 11, fontWeight: "700" },
  planHint: { flex: 1, fontSize: 12, color: colors.muted, textAlign: "right" },
  meActions: { marginTop: spacing.lg },
});
