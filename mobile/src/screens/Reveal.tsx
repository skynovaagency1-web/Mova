import * as React from "react";
import { Animated, Dimensions, Easing, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { SERIF } from "../ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const TOUCH = require("../../assets/reveal-touch.jpg");

// Cover shown after the logo: the passenger slides it down to uncover the sign-in page.
// A tap on the dot does the same, for anyone who cannot swipe.
export function Reveal({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const H = Dimensions.get("window").height;
  // The fingertip in the photo sits at 31.5 % of its height; with "cover" on a phone the photo fills the height.
  const DOT_Y = H * 0.315;
  const y = React.useRef(new Animated.Value(0)).current;
  const appear = React.useRef(new Animated.Value(0)).current;
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(300),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const open = React.useCallback(() => {
    Animated.timing(y, { toValue: H, duration: 520, easing: Easing.bezier(0.65, 0, 0.35, 1), useNativeDriver: true }).start(() => onDone());
  }, [H]);

  const pan = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => y.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (g.dy > H * 0.22 || g.vy > 0.8) open();
          else Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        },
      }),
    [H, open],
  );

  const dim = y.interpolate({ inputRange: [0, H], outputRange: [1, 0.6], extrapolate: "clamp" });
  const ring = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  const hint = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 8, 0] });

  return (
    <Animated.View {...pan.panHandlers} style={[StyleSheet.absoluteFill, { opacity: Animated.multiply(appear, dim), transform: [{ translateY: y }] }]}>
      <Animated.Image source={TOUCH} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]} />
      <LinearGradient colors={["rgba(44,37,29,0)", "rgba(44,37,29,0.28)"]} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ position: "absolute", left: 0, right: 0, top: DOT_Y - 48, alignItems: "center" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir la connexion" onPress={open} hitSlop={20} style={{ alignItems: "center", justifyContent: "center", width: 96, height: 96 }}>
          <Animated.View style={{ position: "absolute", width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.5)", opacity: ringOpacity, transform: [{ scale: ring }] }} />
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFFFFF" }} />
          </View>
        </Pressable>
        <View style={{ width: 1, height: Math.max(40, H * 0.6 - DOT_Y - 60), backgroundColor: "rgba(255,255,255,0.7)" }} />
      </View>
      <View pointerEvents="box-none" style={{ flex: 1, alignItems: "center", paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }}>
        <Text style={{ color: "rgba(255,255,255,0.95)", fontFamily: SERIF, fontSize: 20, letterSpacing: 1, marginRight: -1 }}>MovaaGo</Text>

        <View style={{ flex: 1 }} />

        <View style={{ alignItems: "center", gap: 14, paddingHorizontal: 32 }}>
          <Text style={{ color: "#FFFFFF", fontFamily: SERIF, fontSize: 42, textAlign: "center", lineHeight: 46 }}>
            Votre course,{"\n"}en un geste
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 16, textAlign: "center", lineHeight: 23 }}>
            Taxi et VTC à prix connu d'avance{"\n"}— à portée de main —
          </Text>
        </View>

        <Animated.View style={{ marginTop: 36, alignItems: "center", gap: 6, transform: [{ translateY: hint }] }}>
          <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, letterSpacing: 2.4, textTransform: "uppercase" }}>Glissez vers le bas</Text>
          <Text style={{ color: "#FFFFFF", fontSize: 20, lineHeight: 20 }}>⌄</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
