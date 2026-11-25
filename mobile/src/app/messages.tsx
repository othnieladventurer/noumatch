import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  displayName,
  fetchConversationMessages,
  fetchConversations,
  profilePhoto,
  relativeTime,
  sendChatMessage,
  type ChatMessage,
  type Conversation,
} from "../api/app";
import { apiErrorMessage } from "../api/client";
import { AppChrome } from "../components/AppChrome";
import { useTheme, useThemedStyles } from "../theme";

/** Port of frontend/src/pages/Messages.jsx — list rows, thread header, bubbles, composer. */
export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ conversation?: string }>();
  const styles = useThemedStyles(baseStyles);
  const { colors } = useTheme();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const loadList = useCallback(async () => {
    try {
      setConversations(await fetchConversations());
    } catch (loadError) {
      setError(apiErrorMessage(loadError, "Impossible de charger les conversations."));
    } finally {
      setLoading(false);
    }
  }, []);

  const openConversation = useCallback(async (conversation: Conversation) => {
    setActiveId(conversation.id);
    setThreadLoading(true);
    setError("");
    try {
      setMessages(await fetchConversationMessages(conversation.id));
      setConversations((prev) =>
        prev.map((item) => (item.id === conversation.id ? { ...item, unread_count: 0 } : item)),
      );
    } catch (openError) {
      setError(apiErrorMessage(openError, "Impossible d'ouvrir la conversation."));
    } finally {
      setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  // Deep link /messages?conversation=<id>
  useEffect(() => {
    const requested = params.conversation ? Number(params.conversation) : null;
    if (!requested || activeId) return;
    const found = conversations.find((item) => item.id === requested);
    if (found) void openConversation(found);
  }, [params.conversation, conversations, activeId, openConversation]);

  const active = conversations.find((item) => item.id === activeId) ?? null;
  const other = active?.other_user ?? null;
  const otherPhoto = profilePhoto(other);

  const handleSend = async () => {
    if (!activeId || !text.trim() || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);
    try {
      const sent = await sendChatMessage(activeId, content);
      setMessages((prev) => [...prev, sent]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    } catch (sendError) {
      setText(content);
      setError(apiErrorMessage(sendError, "Impossible d'envoyer le message."));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.red} />
      </View>
    );
  }

  // ── Thread ────────────────────────────────────────────────────────────────
  if (activeId) {
    return (
      <AppChrome active="conversations">
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.threadHeader}>
          <Pressable onPress={() => setActiveId(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour">
            <Text style={styles.back}>←</Text>
          </Pressable>
          <Pressable
            style={styles.threadPerson}
            onPress={() => (other?.id ? router.push(`/profile/${other.id}`) : undefined)}
            accessibilityRole="button"
            accessibilityLabel={`Voir le profil de ${displayName(other)}`}
          >
            {otherPhoto ? (
              <Image source={{ uri: otherPhoto }} style={styles.avatar42} />
            ) : (
              <View style={[styles.avatar42, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{displayName(other).charAt(0)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.threadName} numberOfLines={1}>
                {displayName(other)}
              </Text>
              <View style={styles.threadStatusRow}>
                <View style={[styles.statusDot, !other?.is_online && styles.statusDotOff]} />
                <Text style={styles.threadStatus}>{other?.is_online ? "En ligne" : "Hors ligne"}</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {threadLoading ? (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.red} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.threadBody}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item, index }) => {
              const mine = Boolean(item.is_from_me);
              const previous = index > 0 ? messages[index - 1] : null;
              const showDay = dayLabel(previous?.created_at) !== dayLabel(item.created_at);
              return (
                <>
                {showDay ? (
                  <View style={styles.dayRow}>
                    <Text style={styles.dayText}>{dayLabel(item.created_at)}</Text>
                  </View>
                ) : null}
                <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {mine ? (
                      <Image source={require("../../assets/brand/bubble-mine.png")} style={styles.bubbleGradient} resizeMode="stretch" />
                    ) : null}
                    {item.content ? (
                      <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                        {item.content}
                      </Text>
                    ) : null}
                    <View style={styles.bubbleMeta}>
                      <Text style={[styles.bubbleTime, mine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
                        {relativeTime(item.created_at)}
                      </Text>
                      {mine ? (
                        <Text style={[styles.ticks, item.read && styles.ticksRead]}>{item.read ? "✓✓" : "✓"}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
                </>
              );
            }}
            ListEmptyComponent={
              <View style={styles.threadEmpty}>
                <Text style={styles.emptyEmoji}>👋</Text>
                <Text style={styles.emptyText}>Dites bonjour</Text>
                <Text style={styles.emptyHint}>Votre premier message lance la conversation.</Text>
              </View>
            }
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Écrivez un message…"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
            multiline
            onSubmitEditing={() => void handleSend()}
          />
          <Pressable
            onPress={() => void handleSend()}
            disabled={sending || !text.trim()}
            style={[styles.send, (sending || !text.trim()) && styles.sendDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Envoyer"
          >
            <Text style={styles.sendText}>{sending ? "…" : "Envoyer"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      </AppChrome>
    );
  }

  // ── Inbox ─────────────────────────────────────────────────────────────────
  return (
    <AppChrome active="conversations">
    <View style={styles.root}>
      <View style={styles.listHeader}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour">
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.listTitle}>Messages</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={conversations}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listBody}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Aucune conversation pour le moment.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const photo = profilePhoto(item.other_user);
          return (
            <Pressable
              onPress={() => void openConversation(item)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              accessibilityRole="button"
            >
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatar44} />
              ) : (
                <View style={[styles.avatar44, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{displayName(item.other_user).charAt(0)}</Text>
                </View>
              )}
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {displayName(item.other_user)}
                  </Text>
                  <Text style={styles.rowTime}>{relativeTime(item.last_message?.created_at)}</Text>
                </View>
                <Text style={styles.rowText} numberOfLines={1}>
                  {item.last_message?.content || "Démarrer la conversation"}
                </Text>
              </View>
              {(item.unread_count ?? 0) > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unread_count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
    </AppChrome>
  );
}

/** "Aujourd'hui" / "Hier" / "24 novembre 2026" separators between days. */
function dayLabel(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const startOf = (input: Date) => new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(date)) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },

  listHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  back: { fontSize: 18, color: "#ff4d6d" },
  listTitle: { fontSize: 18, fontWeight: "700", color: "#212529" },
  listBody: { padding: 12, gap: 8 },

  row: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f8f9fa", borderRadius: 16, padding: 8 },
  rowPressed: { opacity: 0.75 },
  avatar44: { width: 44, height: 44, borderRadius: 22 },
  avatar42: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { backgroundColor: "#e9ecef", alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 14, fontWeight: "700", color: "#6c757d" },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowName: { flex: 1, fontSize: 13.5, fontWeight: "600", color: "#212529" },
  rowTime: { fontSize: 11, color: "#6c757d" },
  rowText: { fontSize: 12, color: "#6c757d", marginTop: 2 },
  badge: { backgroundColor: "#dc3545", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  badgeText: { color: "#fff", fontSize: 10.5, fontWeight: "700" },

  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EEE8",
    backgroundColor: "#fff",
  },
  threadPerson: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  threadName: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  threadStatusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ade80" },
  statusDotOff: { backgroundColor: "#CED4DA" },
  threadStatus: { fontSize: 11, color: "#6c757d" },
  dayRow: { alignItems: "center", marginVertical: 10 },
  dayText: {
    fontSize: 10.5,
    color: "#8a8f98",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  threadEmpty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 4 },
  emptyEmoji: { fontSize: 24, marginBottom: 4 },
  emptyHint: { fontSize: 12, color: "#9aa1ac", textAlign: "center" },
  threadBody: { padding: 12, gap: 8, backgroundColor: "#FAF8F4", flexGrow: 1 },

  bubbleRow: { flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, overflow: "hidden" },
  bubbleMine: { backgroundColor: "#ff4d6d" },
  bubbleTheirs: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#dee2e6" },
  bubbleGradient: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  bubbleText: { fontSize: 12.5, lineHeight: 16.5 },
  bubbleTextMine: { color: "#fff" },
  bubbleTextTheirs: { color: "#212529" },
  bubbleMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  bubbleTime: { fontSize: 10.5 },
  bubbleTimeMine: { color: "rgba(255,255,255,0.75)" },
  bubbleTimeTheirs: { color: "#6c757d" },
  ticks: { fontSize: 10.5, color: "rgba(255,255,255,0.5)" },
  ticksRead: { color: "#fff" },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dee2e6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 12.5,
    color: "#212529",
    backgroundColor: "#fff",
  },
  send: { backgroundColor: "#dc3545", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11 },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: "#fff", fontWeight: "600", fontSize: 12.5 },

  error: { color: "#dc3545", fontSize: 12, paddingHorizontal: 16, paddingVertical: 6 },
  emptyText: { color: "#6c757d", fontSize: 12.5, textAlign: "center" },
});
