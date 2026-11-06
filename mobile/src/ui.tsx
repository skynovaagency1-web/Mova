import * as React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";

// Warm studio palette: cream paper, sand and taupe stone, ink-brown text, serif wordmark.
export const C = {
  bg: "#EDE7E1",
  bgTop: "#F4EFEA",
  bgBottom: "#DFD4C9",
  card: "#FBF8F5",
  fg: "#2C251D",
  muted: "#8A7B6E",
  border: "rgba(44,37,29,0.1)",
  primary: "#2C251D",
  primaryFg: "#FBF8F5",
  signal: "#9C7E63",
  signalSoft: "#EADFD4",
  board: "#2C251D",
  boardFg: "#F4EFEA",
  warning: "#B4541E",
  danger: "#A53E2C",
  accentOnDark: "#D9C3A8",
};

export const SERIF = Platform.select({ ios: "Didot", android: "serif", default: "'Cormorant Garamond', Didot, Georgia, serif" });

export const shadow = {
  shadowColor: "#5A4632",
  shadowOpacity: 0.09,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 10 },
  elevation: 3,
} as const;

// Soft studio-light background used behind every screen.
export function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={[C.bgTop, C.bg, C.bgBottom]} locations={[0, 0.45, 1]} style={{ flex: 1 }}>
      {children}
    </LinearGradient>
  );
}

export function Wordmark({ size = 28, color = C.fg }: { size?: number; color?: string }) {
  return <Text style={{ fontFamily: SERIF, fontSize: size, fontWeight: "400", letterSpacing: size * 0.03, color, marginRight: -size * 0.03 }}>MovaaGo</Text>;
}

export function Title({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[s.title, style]}>{children}</Text>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: object }) {
  return <Text style={[s.body, muted && { color: C.muted }, style]}>{children}</Text>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <TextInput placeholderTextColor="#9C8E80" style={s.input} {...props} />
    </View>
  );
}

// Liquid-glass tints, after the reference kit: frosted pastel, white rim, top highlight, coloured glow.
export const GLASS = {
  sand: { fill: "rgba(216,193,168,0.66)", glow: "#A8835F" },
  sage: { fill: "rgba(200,206,182,0.66)", glow: "#7F8B66" },
  clay: { fill: "rgba(228,184,163,0.68)", glow: "#B86B4F" },
  clear: { fill: "rgba(255,255,255,0.5)", glow: "#9C8672" },
} as const;
export type Tint = keyof typeof GLASS;

export function Glass({ tint = "clear", radius = 999, style, children }: { tint?: Tint; radius?: number; style?: ViewStyle; children?: React.ReactNode }) {
  const t = GLASS[tint];
  return (
    <View
      style={[
        { borderRadius: radius, backgroundColor: t.fill, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.92)" },
        { shadowColor: t.glow, shadowOpacity: tint === "clear" ? 0.12 : 0.32, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
        style,
      ]}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}>
        <LinearGradient colors={["rgba(255,255,255,0.85)", "rgba(255,255,255,0)"]} locations={[0, 0.55]} style={{ position: "absolute", left: 6, right: 6, top: 2, height: "55%", borderRadius: radius }} />
        <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.35)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "35%" }} />
      </View>
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  busy,
  disabled,
  variant = "primary",
  style,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline" | "danger" | "signal";
  style?: ViewStyle;
}) {
  const tint: Tint = { primary: "sand", outline: "clear", danger: "clay", signal: "sage" }[variant] as Tint;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || busy} style={style}>
      {({ pressed }) => (
        <Glass tint={tint} style={{ ...s.button, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }}>
          {busy ? <ActivityIndicator color={C.fg} /> : <Text style={s.buttonText}>{title}</Text>}
        </Glass>
      )}
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress}>
      <Glass tint={active ? "sand" : "clear"} style={s.chip}>
        <Text style={{ color: C.fg, fontWeight: active ? "600" : "400" }}>{label}</Text>
      </Glass>
    </Pressable>
  );
}

export function Card({ children, dark, style }: { children: React.ReactNode; dark?: boolean; style?: ViewStyle }) {
  if (dark)
    return (
      <LinearGradient colors={["#3B3229", "#2C251D"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.card, { shadowOpacity: 0.25 }, style]}>
        {children}
      </LinearGradient>
    );
  return <View style={[s.card, style]}>{children}</View>;
}

export function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <Text style={{ color: C.warning, fontWeight: "500" }}>{children}</Text>;
}

export const s = StyleSheet.create({
  title: { fontFamily: SERIF, fontSize: 36, fontWeight: "400", color: C.fg, letterSpacing: -0.5 },
  label: { fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", color: C.muted, fontWeight: "600" },
  body: { fontSize: 16, color: C.fg, lineHeight: 23 },
  input: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.95)",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 17,
    color: C.fg,
  },
  button: { minHeight: 56, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  buttonText: { fontSize: 17, fontWeight: "500", letterSpacing: -0.2, color: C.fg },
  chip: { paddingHorizontal: 16, paddingVertical: 10 },
  card: { backgroundColor: C.card, borderRadius: 24, padding: 20, gap: 12, ...shadow },
});
