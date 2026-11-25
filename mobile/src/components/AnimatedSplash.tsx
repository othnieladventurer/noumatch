import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions } from "react-native";

import { useTheme } from "../theme";

// Native size of assets/splash-logo.png (stacked mark + wordmark).
const LOGO_ASPECT = 1000 / 467;

/**
 * Full-logo launch screen that animates up while the app boots.
 *
 * The native splash (app.json → splash-logo.png on cream) hands over to this
 * overlay, which rises + fades the logo in, floats it gently until `ready`,
 * then fades out. It never blocks touches.
 */
export function AnimatedSplash({ ready }: { ready: boolean }) {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const logoWidth = Math.min(Math.max(width * 0.58, 210), 320);

  const rise = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    Animated.timing(rise, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      Animated.loop(
        Animated.sequence([
          Animated.timing(float, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(float, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, [rise, float]);

  useEffect(() => {
    if (!ready) return;
    Animated.timing(exit, {
      toValue: 1,
      duration: 380,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setHidden(true);
    });
  }, [ready, exit]);

  if (hidden) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.root,
        { backgroundColor: colors.cream },
        { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
      ]}
    >
      <Animated.View
        style={{ transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }}
      >
        <Animated.Image
          source={require("../../assets/splash-logo.png")}
          resizeMode="contain"
          style={{
            width: logoWidth,
            height: logoWidth / LOGO_ASPECT,
            opacity: rise,
            tintColor: isDark ? "#F4F6FB" : undefined,
            transform: [
              { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
              { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            ],
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFF9F5",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    elevation: 1000,
  },
});
