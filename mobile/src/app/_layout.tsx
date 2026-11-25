import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../auth/AuthProvider";
import { AnimatedSplash } from "../components/AnimatedSplash";
import { ThemeProvider, useTheme } from "../theme";

/** Splash stays until the session is resolved, and at least long enough to see it. */
function RootStack() {
  const { status } = useAuth();
  const { colors, isDark } = useTheme();
  const [minimumElapsed, setMinimumElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinimumElapsed(true), 1100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.cream },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="register" />
        <Stack.Screen name="verify" options={{ animation: "fade" }} />
        <Stack.Screen name="home" options={{ animation: "fade" }} />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="likes" />
        <Stack.Screen name="messages" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="profile" />
        <Stack.Screen name="profile/[id]" />
        <Stack.Screen name="ad/[id]" />
      </Stack>
      <AnimatedSplash ready={status !== "loading" && minimumElapsed} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootStack />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
