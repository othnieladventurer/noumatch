import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";

type Props = {
  step: number; // 1-based
  labels: string[];
};

/** Mirrors `.auth-steps` from the web auth stylesheet: 34dp circles, 2dp connectors. */
export function StepProgress({ step, labels }: Props) {
  return (
    <View style={styles.row}>
      {labels.map((label, index) => {
        const state = step > index + 1 ? "done" : step === index + 1 ? "active" : "pending";

        return (
          <React.Fragment key={label}>
            <View style={styles.step}>
              <View
                style={[
                  styles.circle,
                  state === "active" && styles.circleActive,
                  state === "done" && styles.circleDone,
                ]}
              >
                <Text style={[styles.circleText, state !== "pending" && styles.circleTextOn]}>
                  {state === "done" ? "✓" : index + 1}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  state === "active" && styles.labelActive,
                  state === "done" && styles.labelDone,
                ]}
              >
                {label}
              </Text>
            </View>

            {index < labels.length - 1 ? (
              <View style={[styles.connector, step > index + 1 && styles.connectorDone]} />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  step: {
    alignItems: "center",
    flexShrink: 0,
    gap: 4,
    minWidth: 58,
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.creamDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  circleActive: {
    backgroundColor: colors.red,
  },
  circleDone: {
    backgroundColor: colors.success,
  },
  circleText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
  },
  circleTextOn: {
    color: colors.white,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
    color: colors.placeholder,
  },
  labelActive: {
    color: colors.red,
  },
  labelDone: {
    color: colors.success,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginTop: 17,
    marginHorizontal: 6,
  },
  connectorDone: {
    backgroundColor: colors.success,
  },
});
