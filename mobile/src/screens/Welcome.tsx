import * as React from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { C, Wordmark } from "../ui";

const GLOBE = require("../../assets/welcome-globe.jpg");

// Opening scene: the camera pushes into the globe while it grows, the light washes out,
// and the MovaaGo wordmark settles in. About 3.4 s, then hands over to the app.
export function Welcome({ onDone }: { onDone: () => void }) {
  const appear = React.useRef(new Animated.Value(0)).current;
  const zoom = React.useRef(new Animated.Value(0)).current;
  const veil = React.useRef(new Animated.Value(0)).current;
  const mark = React.useRef(new Animated.Value(0)).current;
  const exit = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const ease = Easing.bezier(0.65, 0, 0.35, 1);
    const anim = Animated.sequence([
      Animated.timing(appear, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(zoom, { toValue: 1, duration: 2000, easing: ease, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(1100),
          Animated.timing(veil, { toValue: 1, duration: 800, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(1500),
          Animated.timing(mark, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
      Animated.delay(700),
      Animated.timing(exit, { toValue: 0, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && onDone());
    return () => anim.stop();
  }, []);

  const scale = zoom.interpolate({ inputRange: [0, 1], outputRange: [1.04, 3.4] });
  const markScale = mark.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const markY = mark.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const lineScale = mark.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.bgTop, opacity: exit }]} pointerEvents="none">
      <Animated.Image
        source={GLOBE}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%", opacity: appear, transform: [{ scale }] }]}
      />
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#F6F1EC", opacity: veil }]} />
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <Animated.View style={{ alignItems: "center", gap: 18, opacity: mark, transform: [{ translateY: markY }, { scale: markScale }] }}>
          <Wordmark size={44} />
          <Animated.View style={{ width: 36, height: 1, backgroundColor: C.signal, transform: [{ scaleX: lineScale }] }} />
          <Text style={{ fontSize: 12, letterSpacing: 3.2, color: C.muted, textTransform: "uppercase" }}>Votre trajet, à l'heure</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
