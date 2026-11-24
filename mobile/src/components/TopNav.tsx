import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  displayName,
  fetchConversations,
  fetchNotifications,
  markAllNotificationsRead,
  markConversationRead,
  markNotificationRead,
  profilePhoto,
  relativeTime,
  type AppNotification,
  type Conversation,
  type UserProfile,
} from "../api/app";
import { colors, radius } from "../theme";
import { AccountMenu } from "./AccountMenu";

// Bell and inbox share one glyph size; the logo mark is wider than it is tall,
// so it gets a larger box to read at the same optical weight.
const GLYPH = 24;
const LOGO = 38;
const BAR_HEIGHT = 56;
const PANEL_WIDTH = Math.min(360, Dimensions.get("window").width - 32);

type Panel = "notifications" | "messages" | null;

type Props = {
  user?: UserProfile | null;
  unread?: number;
  notificationUnread?: number;
  onMessages?: () => void;
  onNotifications?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  onSignOut?: () => void;
};

const NOTIFICATION_ICONS: Record<string, string> = {
  welcome: "⭐",
  new_like: "❤️",
  new_match: "🤝",
  new_message: "✉️",
  report_received: "🚩",
  report_reviewed: "🚩",
  report_action_taken: "🚩",
};

const notificationIcon = (type: string) => NOTIFICATION_ICONS[type] ?? "🔔";

const notificationTitle = (item: AppNotification) =>
  item.type === "new_message" && (item.count ?? 0) > 1 ? `${item.count}x ${item.title}` : item.title;

/**
 * Mirrors `.nm-navbar` from the web dashboard: white 64dp bar, brand logo on the left,
 * notifications bell, messages button and the profile avatar with an online dot.
 *
 * The bell and the envelope open the same dropdown panels as NotificationBell.jsx and
 * DashboardNavbar.jsx: recent rows, "Tout marquer comme lu", and a link to the full page.
 */
export function TopNav({
  user,
  unread = 0,
  notificationUnread = 0,
  onMessages,
  onNotifications,
  onProfile,
  onSettings,
  onSignOut,
}: Props) {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [localNotificationUnread, setLocalNotificationUnread] = useState(notificationUnread);
  const [localMessageUnread, setLocalMessageUnread] = useState(unread);

  const photo = profilePhoto(user);
  const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase();

  useEffect(() => setLocalNotificationUnread(notificationUnread), [notificationUnread]);
  useEffect(() => setLocalMessageUnread(unread), [unread]);

  const loadPanel = useCallback(async (target: Panel) => {
    if (!target) return;
    setLoadingPanel(true);
    try {
      if (target === "notifications") setNotifications(await fetchNotifications());
      else setConversations(await fetchConversations());
    } catch {
      /* the badge counts stay as the fallback */
    } finally {
      setLoadingPanel(false);
    }
  }, []);

  const togglePanel = (target: Exclude<Panel, null>) => {
    const next = panel === target ? null : target;
    setPanel(next);
    if (next) void loadPanel(next);
  };

  const openNotification = async (item: AppNotification) => {
    if (!item.is_read) {
      try {
        await markNotificationRead(item.id);
        setNotifications((prev) => prev.map((row) => (row.id === item.id ? { ...row, is_read: true } : row)));
        setLocalNotificationUnread((prev) => Math.max(0, prev - 1));
      } catch {
        /* keep the row visible even if the request failed */
      }
    }
    setPanel(null);
    if (item.type === "new_message") {
      router.push("/messages");
      return;
    }
    if (item.link) {
      const path = item.link.replace(/^https?:\/\/[^/]+/, "");
      router.push((path.startsWith("/") ? path : `/${path}`) as never);
    }
  };

  const markEverythingRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((row) => ({ ...row, is_read: true })));
      setLocalNotificationUnread(0);
    } catch {
      /* leave counts untouched on failure */
    }
  };

  const openConversation = (conversation: Conversation) => {
    setPanel(null);
    router.push(`/messages?conversation=${conversation.id}`);
  };

  const markThreadRead = async (conversation: Conversation) => {
    try {
      await markConversationRead(conversation.id);
      setConversations((prev) =>
        prev.map((row) => (row.id === conversation.id ? { ...row, unread_count: 0 } : row)),
      );
      setLocalMessageUnread((prev) => Math.max(0, prev - (conversation.unread_count ?? 0)));
    } catch {
      /* ignore */
    }
  };

  const panelTop = insets.top + BAR_HEIGHT;

  return (
    <View style={styles.root}>
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        <View style={styles.slot}>
          <Image
            source={require("../../assets/brand/logo-mark.png")}
            style={styles.mark}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="NouMatch"
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => togglePanel("notifications")}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, panel === "notifications" && styles.iconButtonActive]}
            accessibilityRole="button"
            accessibilityLabel={
              localNotificationUnread > 0
                ? `Notifications, ${localNotificationUnread} non lues`
                : "Notifications"
            }
            hitSlop={6}
          >
            <Image source={require("../../assets/brand/icon-bell.png")} style={styles.icon} resizeMode="contain" />
            {localNotificationUnread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{localNotificationUnread > 99 ? "99+" : localNotificationUnread}</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => togglePanel("messages")}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, panel === "messages" && styles.iconButtonActive]}
            accessibilityRole="button"
            accessibilityLabel={localMessageUnread > 0 ? `Messages, ${localMessageUnread} non lus` : "Messages"}
            hitSlop={6}
          >
            <Image source={require("../../assets/brand/icon-chat.png")} style={styles.icon} resizeMode="contain" />
            {localMessageUnread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{localMessageUnread > 99 ? "99+" : localMessageUnread}</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Menu du compte de ${displayName(user)}`}
            hitSlop={6}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View style={styles.avatarWrap}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials || "N"}</Text>
                </View>
              )}
              <View style={styles.onlineDot} />
            </View>
          </Pressable>
        </View>
      </View>

    </View>

      {/* Outside-tap catcher for the panels, below the bar so it stays clickable */}
      {panel ? (
        <Pressable
          style={{ position: "absolute", top: panelTop, left: 0, right: 0, height: Dimensions.get("window").height }}
          onPress={() => setPanel(null)}
        />
      ) : null}

      {panel === "notifications" ? (
        <View style={[styles.panel, { top: panelTop }]}>
          <View style={styles.panelHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>
                Notifications ({notifications.length})
                {localNotificationUnread > 0 ? (
                  <Text style={styles.panelSubtitle}>
                    {"  "}({localNotificationUnread} non {localNotificationUnread > 1 ? "lues" : "lue"})
                  </Text>
                ) : null}
              </Text>
            </View>
            {localNotificationUnread > 0 ? (
              <Pressable onPress={() => void markEverythingRead()} hitSlop={6}>
                <Text style={styles.markAll}>✓ Tout marquer comme lu</Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {loadingPanel ? (
              <View style={styles.panelEmpty}>
                <Text style={styles.panelEmptyText}>Chargement des notifications...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.panelEmpty}>
                <Text style={styles.panelEmptyIcon}>🔔</Text>
                <Text style={styles.panelEmptyText}>Pas encore de notifications</Text>
              </View>
            ) : (
              notifications.slice(0, 8).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => void openNotification(item)}
                  style={[styles.notifRow, !item.is_read && styles.notifRowUnread]}
                >
                  <View style={[styles.notifIcon, !item.is_read ? styles.notifIconUnread : styles.notifIconRead]}>
                    <Text style={{ fontSize: 16 }}>{notificationIcon(item.type)}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.notifTop}>
                      <Text
                        style={[styles.notifTitle, !item.is_read && { fontWeight: "700" }]}
                        numberOfLines={1}
                      >
                        {notificationTitle(item) || "Notification"}
                      </Text>
                      <Text style={styles.notifTime}>{relativeTime(item.created_at)}</Text>
                    </View>
                    <Text style={styles.notifMessage} numberOfLines={1}>
                      {item.message}
                    </Text>
                    <View style={styles.badgeRow}>
                      {!item.is_read ? (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>Nouveau</Text>
                        </View>
                      ) : null}
                      {item.type === "new_message" && (item.count ?? 0) > 1 ? (
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>{item.count} messages</Text>
                        </View>
                      ) : null}
                      {item.is_read ? (
                        <View style={styles.readBadge}>
                          <Text style={styles.readBadgeText}>Lu</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          <Pressable
            style={styles.panelFooter}
            onPress={() => {
              setPanel(null);
              onNotifications?.();
            }}
          >
            <Text style={styles.panelFooterDanger}>Voir toutes les notifications</Text>
          </Pressable>
        </View>
      ) : null}

      {panel === "messages" ? (
        <View style={[styles.panel, { top: panelTop }]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Messages ({conversations.length})</Text>
            {localMessageUnread > 0 ? (
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>
                  {localMessageUnread} non lu{localMessageUnread > 1 ? "s" : ""}
                </Text>
              </View>
            ) : null}
          </View>

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {loadingPanel ? (
              <View style={styles.panelEmpty}>
                <Text style={styles.panelEmptyText}>Chargement des messages...</Text>
              </View>
            ) : conversations.length === 0 ? (
              <View style={styles.panelEmpty}>
                <Text style={styles.panelEmptyIcon}>✉️</Text>
                <Text style={styles.panelEmptyText}>Pas encore de messages</Text>
                <Text style={styles.panelEmptyHint}>
                  Quand vous matchez avec quelqu'un, vous pourrez discuter ici
                </Text>
              </View>
            ) : (
              conversations.map((conversation) => {
                const other = conversation.other_user ?? null;
                const otherPhoto = profilePhoto(other);
                const unreadCount = conversation.unread_count ?? 0;
                return (
                  <View key={conversation.id} style={[styles.messageRow, unreadCount > 0 && styles.messageRowUnread]}>
                    <Pressable style={styles.messageMain} onPress={() => openConversation(conversation)}>
                      <View style={styles.avatarStack}>
                        {otherPhoto ? (
                          <Image source={{ uri: otherPhoto }} style={styles.messageAvatar} />
                        ) : (
                          <View style={[styles.messageAvatar, styles.avatarFallback]}>
                            <Text style={styles.messageAvatarInitial}>
                              {displayName(other).charAt(0)}
                            </Text>
                          </View>
                        )}
                        <View
                          style={[
                            styles.messageOnline,
                            { backgroundColor: other?.is_online ? "#4ade80" : "#9ca3af" },
                          ]}
                        />
                      </View>

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.messageTop}>
                          <Text style={styles.messageName} numberOfLines={1}>
                            {displayName(other)}
                          </Text>
                          <Text style={styles.messageTime}>
                            {relativeTime(conversation.last_message?.created_at)}
                          </Text>
                        </View>
                        <View style={styles.messagePreviewRow}>
                          {unreadCount > 0 ? (
                            <View style={styles.unreadPill}>
                              <Text style={styles.unreadPillText}>{unreadCount}</Text>
                            </View>
                          ) : null}
                          <Text style={styles.messagePreview} numberOfLines={1}>
                            {conversation.last_message?.content || "Démarrer une conversation"}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.messageStatus,
                            { color: other?.is_online ? "#4ade80" : "#9ca3af" },
                          ]}
                        >
                          {other?.is_online ? "En ligne" : "Hors ligne"}
                        </Text>
                      </View>
                    </Pressable>

                    {unreadCount > 0 ? (
                      <Pressable
                        style={styles.markReadBtn}
                        onPress={() => void markThreadRead(conversation)}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel="Marquer comme lu"
                      >
                        <Text style={styles.markReadText}>✓</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>

          <Pressable
            style={styles.panelFooter}
            onPress={() => {
              setPanel(null);
              onMessages?.();
            }}
          >
            <Text style={styles.panelFooterPrimary}>Voir tous les messages</Text>
          </Pressable>
        </View>
      ) : null}

      <AccountMenu
        visible={menuOpen}
        user={user}
        onClose={() => setMenuOpen(false)}
        onProfile={() => onProfile?.()}
        onSettings={onSettings}
        onSignOut={() => onSignOut?.()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "relative", zIndex: 20 },
  bar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 20,
  },
  inner: {
    height: BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  // Logo sits in the same 42dp slot as the bell/inbox buttons, glyph centred.
  slot: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  mark: {
    width: LOGO,
    height: LOGO,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  iconButtonActive: {
    backgroundColor: "#ffe9ee",
  },
  pressed: {
    opacity: 0.6,
  },
  icon: {
    width: GLYPH,
    height: GLYPH,
    tintColor: colors.inkSoft,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
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
  avatarWrap: {
    width: 38,
    height: 38,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.creamDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.red,
  },
  onlineDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#4ade80",
    borderWidth: 2,
    borderColor: colors.white,
  },

  panel: {
    position: "absolute",
    right: 16,
    width: PANEL_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  panelTitle: { fontSize: 14, fontWeight: "700", color: "#212529" },
  panelSubtitle: { fontSize: 12, fontWeight: "400", color: "#6c757d" },
  markAll: { fontSize: 12.5, color: "#dc3545" },
  panelEmpty: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20 },
  panelEmptyIcon: { fontSize: 26, opacity: 0.5, marginBottom: 6 },
  panelEmptyText: { fontSize: 12.5, color: "#6c757d", textAlign: "center" },
  panelEmptyHint: { fontSize: 11.5, color: "#8a8f98", textAlign: "center", marginTop: 4 },
  panelFooter: {
    alignItems: "center",
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  panelFooterDanger: { fontSize: 12.5, color: "#dc3545" },
  panelFooterPrimary: { fontSize: 12.5, color: "#0d6efd" },

  notifRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "flex-start",
  },
  notifRowUnread: { backgroundColor: "#f8f9fa" },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notifIconUnread: { backgroundColor: "rgba(255,77,109,0.13)" },
  notifIconRead: { backgroundColor: "#f8f9fa" },
  notifTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  notifTitle: { flex: 1, fontSize: 13, fontWeight: "600", color: "#212529" },
  notifTime: { fontSize: 10.4, color: "#6c757d" },
  notifMessage: { fontSize: 12, color: "#6c757d", marginTop: 2 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  newBadge: { backgroundColor: "#dc3545", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  newBadgeText: { color: "#fff", fontSize: 9.6, fontWeight: "700" },
  countBadge: { backgroundColor: "#6c757d", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  countBadgeText: { color: "#fff", fontSize: 9.6, fontWeight: "700" },
  readBadge: { backgroundColor: "#f8f9fa", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  readBadgeText: { color: "#212529", fontSize: 9.6 },

  messageRow: { flexDirection: "row", alignItems: "center", paddingRight: 12 },
  messageRowUnread: { backgroundColor: "#f8f9fa" },
  messageMain: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  avatarStack: { width: 32, height: 32 },
  messageAvatar: { width: 32, height: 32, borderRadius: 16 },
  messageAvatarInitial: { fontSize: 12, fontWeight: "700", color: colors.red },
  messageOnline: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#fff",
  },
  messageTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  messageName: { flex: 1, fontSize: 13.5, fontWeight: "600", color: "#212529" },
  messageTime: { fontSize: 11, color: "#6c757d" },
  messagePreviewRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 },
  messagePreview: { flex: 1, fontSize: 12.5, color: "#6c757d" },
  messageStatus: { fontSize: 10.4, marginTop: 2 },
  unreadPill: { minWidth: 16, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 999, backgroundColor: "#dc3545", alignItems: "center" },
  unreadPillText: { color: "#fff", fontSize: 9.6, fontWeight: "700" },
  markReadBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fff0f3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ffd0da",
  },
  markReadText: { color: "#ff4d6d", fontSize: 12, fontWeight: "700" },

  badgePill: { backgroundColor: "#dc3545", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgePillText: { color: "#fff", fontSize: 10.5, fontWeight: "700" },
});
