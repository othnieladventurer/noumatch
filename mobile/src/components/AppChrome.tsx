import { router } from "expo-router";
import React, { type ReactNode, useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { fetchConversations, fetchNotifications, fetchUnreadCount, type UserProfile } from "../api/app";
import { useAuth } from "../auth/AuthProvider";
import { BottomNav, type NavTab } from "./BottomNav";
import { TopNav } from "./TopNav";

type Props = {
  active: NavTab;
  children: ReactNode;
};

/**
 * Keeps `.nm-navbar` and `.mobile-bottom-nav` visible on detail screens
 * (profile, messages, notifications), the way the web app always renders both.
 */
export function AppChrome({ active, children }: Props) {
  const { user, signOut } = useAuth();
  const me = user as unknown as UserProfile | undefined;

  const [unread, setUnread] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);

  const refreshBadges = useCallback(async () => {
    try {
      const [count, list] = await Promise.all([fetchUnreadCount(), fetchNotifications()]);
      setUnread(count);
      setNotificationUnread(list.filter((item) => !item.is_read).length);
    } catch {
      /* badges are decorative here */
    }
  }, []);

  useEffect(() => {
    void refreshBadges();
  }, [refreshBadges]);

  const goToTab = (tab: NavTab) => {
    router.replace({ pathname: "/home", params: { tab } });
  };

  return (
    <View style={styles.root}>
      <View style={styles.nav}>
        <TopNav
          user={me}
          unread={unread}
          notificationUnread={notificationUnread}
          onMessages={() => router.push("/messages")}
          onNotifications={() => router.push("/notifications")}
          onProfile={() => router.push("/profile")}
          onSettings={() => router.push("/settings")}
          onSignOut={() => void signOut()}
        />
      </View>

      <View style={styles.body}>{children}</View>

      <BottomNav active={active} onChange={goToTab} unread={unread} user={me} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f7fb" },
  // The navbar always paints above screen content, never under a photo.
  nav: { zIndex: 10, elevation: 10, backgroundColor: "#fff" },
  body: { flex: 1 },
});
