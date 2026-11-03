import { Text, View } from "react-native";
import { euro } from "../places";
import type { Ride } from "../api";
import { C } from "../ui";

export function RideRoute({ ride, dark }: { ride: Pick<Ride, "pickup_label" | "dropoff_label" | "km" | "minutes" | "price_estimate">; dark?: boolean }) {
  const fg = dark ? C.boardFg : C.fg;
  const muted = dark ? "#B5A898" : C.muted;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.signal }} />
        <Text style={{ color: fg, fontSize: 16, fontWeight: "600", flex: 1 }}>{ride.pickup_label}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View style={{ width: 10, height: 10, backgroundColor: fg }} />
        <Text style={{ color: fg, fontSize: 16, fontWeight: "600", flex: 1 }}>{ride.dropoff_label}</Text>
      </View>
      <Text style={{ color: muted, fontVariant: ["tabular-nums"] }}>
        {String(ride.km).replace(".", ",")} km · {ride.minutes} min · ≈ {euro(ride.price_estimate)}
      </Text>
    </View>
  );
}
