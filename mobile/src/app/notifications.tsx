import { Redirect, router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  relativeTime,
  type AppNotification,
} from "../api/app";
import { useAuth } from "../auth/AuthProvider";
import { AppChrome } from "../components/AppChrome";
import { colors, useTheme, useThemedStyles } from "../theme";

const ICONS: Record<string, string> = {
  welcome: "⭐",
  new_like: "❤️",
  new_match: "🤝",
  new_message: "✉️",
  report_received: "🚩",
  report_reviewed: "🚩",
  report_action_taken: "🚩",
};

type Filter = "all" | "unread" | "read";

/** Port of frontend/src/pages/Notifications.jsx. */
export default function NotificationsScreen() {
  const { status } = useAuth();
  const styles = useThemedStyles(baseStyles);
  const { colors: theme } = useTheme();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await fetchNotifications());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "signedOut") return <Redirect href="/" />;

  const unreadCount = items.filter((item) => !item.is_read).length;

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleOpen = async (item: AppNotification) => {
    if (!item.is_read) {
      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, is_read: true } : entry)),
      );
      try {
        await markNotificationRead(item.id);
      } catch {
        void load();
      }
    }
  };

  const handleMarkAll = async () => {
    const previous = items;
    setItems((prev) => prev.map((entry) => ({ ...entry, is_read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      setItems(previous);
    }
  };

  const handleDelete = async (item: AppNotification) => {
    const previous = items;
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    try {
      await deleteNotification(item.id);
    } catch {
      setItems(previous);
    }
  };

  const filtered = items.filter((item) => {
    if (filter === "unread") return !item.is_read;
    if (filter === "read") return item.is_read;
    return true;
  });

  // Group by day, like the web's reduce on toLocaleDateString.
  const groups: { date: string; rows: AppNotification[] }[] = [];
  for (const item of filtered) {
    const key = new Date(item.created_at).toLocaleDateString("fr-FR");
    const existing = groups.find((group) => group.date === key);
    if (existing) existing.rows.push(item);
    else groups.push({ date: key, rows: [item] });
  }

  return (
    <AppChrome active="discover">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.red} />}
        showsVerticalScrollIndicator={false}
      >
        {/* header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour">
            <Text style={styles.back}>←</Text>
          </Pressable>
          <Text style={styles.title}>Notifications</Text>
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        {/* stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{items.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{unreadCount}</Text>
            <Text style={styles.statLabel}>Non lues</Text>
          </View>
        </View>

        {/* filters */}
        <View style={styles.filters}>
          {[
            { key: "all" as Filter, label: "Toutes" },
            { key: "unread" as Filter, label: "Non lues" },
            { key: "read" as Filter, label: "Lues" },
          ].map((option) => {
            const active = filter === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setFilter(option.key)}
                style={[styles.pill, active ? styles.pillActive : styles.pillIdle]}
                accessibilityRole="button"
              >
                <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextIdle]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}

          {unreadCount > 0 ? (
            <Pressable onPress={handleMarkAll} style={[styles.pill, styles.pillSecondary]} accessibilityRole="button">
              <Text style={styles.pillSecondaryText}>Tout marquer comme lu</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={onRefresh} style={[styles.pill, styles.pillSecondary, styles.pillRight]} accessibilityRole="button">
            <Text style={styles.pillSecondaryText}>Rafraîchir</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.red} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyCircle}>
              <Text style={styles.emptyIcon}>🔔</Text>
            </View>
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyCopy}>
              {filter === "unread"
                ? "Vous avez tout lu. Revenez plus tard !"
                : filter === "read"
                  ? "Aucune notification lue pour le moment."
                  : "Vos likes, matchs et messages apparaîtront ici."}
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.date} style={styles.group}>
              <Text style={styles.groupDate}>{group.date}</Text>
              {group.rows.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => void handleOpen(item)}
                  style={[styles.card, !item.is_read && styles.cardUnread]}
                  accessibilityRole="button"
                >
                  <View style={[styles.iconCircle, !item.is_read && styles.iconCircleUnread]}>
                    <Text style={styles.icon}>{ICONS[item.type] ?? "🔔"}</Text>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <View style={styles.titleWrap}>
                        <Text style={[styles.cardTitle, !item.is_read && styles.cardTitleUnread]} numberOfLines={2}>
                          {item.type === "new_message" && (item.count ?? 0) > 1
                            ? `${item.count}x ${item.title ?? "Nouveau message"}`
                            : item.title ?? "Notification"}
                        </Text>
                        {!item.is_read ? (
                          <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>Nouveau</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.time}>{relativeTime(item.created_at)}</Text>
                    </View>

                    {item.message ? (
                      <Text style={styles.message} numberOfLines={3}>
                        {item.message}
                      </Text>
                    ) : null}

                    <View style={styles.cardActions}>
                      {!item.is_read ? (
                        <Pressable
                          onPress={() => void handleOpen(item)}
                          style={[styles.smallPill, styles.smallPillDanger]}
                          accessibilityRole="button"
                        >
                          <Text style={styles.smallPillDangerText}>Marquer comme lu</Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        onPress={() => void handleDelete(item)}
                        style={[styles.smallPill, styles.smallPillSecondary]}
                        accessibilityRole="button"
                      >
                        <Text style={styles.smallPillSecondaryText}>Supprimer</Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </AppChrome>
  );
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  back: { fontSize: 18, color: "#ff4d6d" },
  title: { flex: 1, fontSize: 19, fontWeight: "700", color: "#212529" },
  liveBadge: { backgroundColor: "#d1e7dd", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  liveText: { fontSize: 11, fontWeight: "700", color: "#0f5132" },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#eef0f3",
  },
  statValue: { fontSize: 18, fontWeight: "700", color: "#ff4d6d" },
  statLabel: { fontSize: 12, color: "#6c757d" },

  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  pillActive: { backgroundColor: "#dc3545", borderColor: "#dc3545" },
  pillIdle: { backgroundColor: "transparent", borderColor: "#dc3545" },
  pillSecondary: { backgroundColor: "transparent", borderColor: "#6c757d" },
  pillRight: { marginLeft: "auto" },
  pillText: { fontSize: 12.5, fontWeight: "600" },
  pillTextActive: { color: "#fff" },
  pillTextIdle: { color: "#dc3545" },
  pillSecondaryText: { fontSize: 12.5, fontWeight: "600", color: "#6c757d" },

  group: { marginBottom: 16 },
  groupDate: { fontSize: 12, fontWeight: "600", color: "#6c757d", marginBottom: 8, paddingHorizontal: 2 },

  card: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardUnread: { backgroundColor: "#f8f9fa" },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleUnread: { backgroundColor: "rgba(220,53,69,0.1)" },
  icon: { fontSize: 18 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  titleWrap: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  cardTitle: { fontSize: 13.5, fontWeight: "600", color: "#212529" },
  cardTitleUnread: { color: "#dc3545" },
  newBadge: { backgroundColor: "#dc3545", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  newBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  time: { fontSize: 10.5, color: "#6c757d" },
  message: { fontSize: 12.5, color: "#6c757d", lineHeight: 16.5, marginBottom: 8 },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 6 },
  smallPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  smallPillDanger: { borderColor: "#dc3545" },
  smallPillDangerText: { fontSize: 11, fontWeight: "600", color: "#dc3545" },
  smallPillSecondary: { borderColor: "#6c757d" },
  smallPillSecondaryText: { fontSize: 11, fontWeight: "600", color: "#6c757d" },

  center: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyIcon: { fontSize: 26, opacity: 0.5 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#212529" },
  emptyCopy: { fontSize: 12.5, color: "#6c757d", textAlign: "center", maxWidth: 280, lineHeight: 17.5 },
});
