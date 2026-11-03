import * as React from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PHOTO_CREDITS, PLACE_PHOTOS } from "../place-photos";
import { usePolling } from "../hooks";
import { CATEGORIES, PLACES, euro, previewPrice, type Place } from "../places";
import { ACTIVE, absolute, call, errorText, type CategoryId, type Contact, type Profile, type Ride } from "../api";
import { Body, Button, C, Card, Chip, ErrorText, Label, SERIF, Title } from "../ui";
import { Header } from "./Header";
import { RideRoute } from "./RideRoute";
import { MapPreview } from "./MapPreview";
import { AddressField } from "./AddressField";
import { etaMinutes } from "../geo";
import { Account } from "./Account";
import { Rudder, RUDDER_SPACE } from "./Rudder";

const STATUS: Record<Ride["status"], { title: string; text: string }> = {
  requested: { title: "Recherche d'un chauffeur…", text: "Votre demande est envoyée aux chauffeurs MOVA en ligne." },
  accepted: { title: "Chauffeur trouvé", text: "Votre chauffeur se prépare à venir vous chercher." },
  arriving: { title: "Votre chauffeur arrive", text: "Rendez-vous au point de prise en charge." },
  in_progress: { title: "En route", text: "Bon trajet avec MOVA." },
  completed: { title: "Vous êtes arrivé", text: "Le paiement n'est pas encore géré dans l'application pilote." },
  cancelled: { title: "Course annulée", text: "" },
};

export function Passenger({ profile }: { profile: Profile }) {
  const [ride, setRide] = React.useState<Ride | null | undefined>(undefined);
  const [dismissed, setDismissed] = React.useState<number | null>(null);
  const [tab, setTab] = React.useState<"ride" | "account">("ride");
  const [bookKey, setBookKey] = React.useState(0);

  const load = React.useCallback(async () => {
    const { data, error } = await call<{ ride: Ride | null }>("/rides/current");
    if (error || !data) return setRide((r) => (r === undefined ? null : r)); // offline: keep what is on screen
    setRide(data.ride);
  }, []);

  const active = ride && (ACTIVE.includes(ride.status) || ride.id !== dismissed);
  usePolling(load, active && ride && ACTIVE.includes(ride.status) ? 4000 : 30000);

  return (
    <View style={{ flex: 1 }}>
      <Header name={profile.first_name} subtitle="Passager" />
      {tab === "account" ? (
        <Account profile={profile} />
      ) : ride === undefined ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.primary} />
      ) : ride && active ? (
        <CurrentRide ride={ride} onChange={setRide} onClose={() => setDismissed(ride.id)} />
      ) : (
        <Book key={bookKey} onBooked={setRide} />
      )}
      <Rudder
        left={{ icon: "route", label: "Course", active: tab === "ride", onPress: () => setTab("ride") }}
        center={{
          icon: "plus",
          label: "Nouvelle course",
          onPress: () => {
            setTab("ride");
            if (ride && !ACTIVE.includes(ride.status)) setDismissed(ride.id);
            if (!ride || !ACTIVE.includes(ride.status)) setBookKey((k) => k + 1);
          },
        }}
        right={{ icon: "person", label: "Compte", active: tab === "account", onPress: () => setTab("account") }}
      />
    </View>
  );
}

function PlacePicker({ label, value, onChange, exclude }: { label: string; value: Place | null; onChange: (p: Place) => void; exclude?: Place | null }) {
  return (
    <View style={{ gap: 10 }}>
      <Label>{label}</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
        {PLACES.filter((p) => p.id !== exclude?.id).map((p) => {
          const on = value?.id === p.id;
          return (
            <Pressable key={p.id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={p.label} onPress={() => onChange(p)}>
              {({ pressed }) => (
                <View style={[ph.card, on && ph.on, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
                  <Image source={{ uri: PLACE_PHOTOS[p.id]?.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <LinearGradient colors={["rgba(44,37,29,0)", "rgba(44,37,29,0.72)"]} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
                  {on && (
                    <View style={ph.check}>
                      <Text style={{ color: C.fg, fontSize: 13, fontWeight: "700" }}>✓</Text>
                    </View>
                  )}
                  <Text style={ph.name} numberOfLines={2}>{p.short}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const ph = StyleSheet.create({
  card: { width: 118, height: 150, borderRadius: 22, overflow: "hidden", backgroundColor: "#D8C9B9", justifyContent: "flex-end", padding: 12, borderWidth: 2, borderColor: "rgba(255,255,255,0.6)" },
  on: { borderColor: "#FFFFFF", shadowColor: "#A8835F", shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  check: { position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  name: { color: "#FFFFFF", fontFamily: SERIF, fontSize: 19, lineHeight: 21 },
});

function Book({ onBooked }: { onBooked: (r: Ride) => void }) {
  const [from, setFrom] = React.useState<Place | null>(null);
  const [to, setTo] = React.useState<Place | null>(null);
  const [active, setActive] = React.useState<"from" | "to">("from");
  const [category, setCategory] = React.useState<CategoryId>("standard");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const est = from && to ? previewPrice(from, to, category) : null;

  const setPlace = (which: "from" | "to", p: Place | null) => {
    setError("");
    if (which === "from") {
      setFrom(p);
      if (p) setActive("to");
    } else setTo(p);
  };

  const book = async () => {
    if (!from || !to) return;
    setBusy(true);
    setError("");
    const { data, error } = await call<{ ride: Ride }>("/rides", {
      method: "POST",
      body: {
        pickup_label: from.label,
        pickup_lat: from.lat,
        pickup_lng: from.lng,
        dropoff_label: to.label,
        dropoff_lat: to.lat,
        dropoff_lng: to.lng,
        category,
      },
    });
    setBusy(false);
    if (error || !data) return setError(errorText(error));
    onBooked(data.ride);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: RUDDER_SPACE }} keyboardShouldPersistTaps="handled">
      <Title>Où allez-vous ?</Title>
      <MapPreview from={from} to={to} />
      <View style={{ gap: 10 }}>
        <AddressField label="Adresse de départ" marker="dot" value={from} onChange={(p) => setPlace("from", p)} onFocus={() => setActive("from")} withLocation />
        <AddressField label="Adresse d'arrivée" marker="square" value={to} onChange={(p) => setPlace("to", p)} onFocus={() => setActive("to")} near={from ?? undefined} />
      </View>
      <PlacePicker
        label={active === "from" ? "Lieux populaires · départ" : "Lieux populaires · arrivée"}
        value={active === "from" ? from : to}
        exclude={active === "from" ? to : from}
        onChange={(p) => setPlace(active, p)}
      />
      <View style={{ gap: 10 }}>
        <Label>Catégorie</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={`${c.label} · ${c.hint}`} active={category === c.id} onPress={() => setCategory(c.id)} />
          ))}
        </View>
      </View>
      {est && (
        <Card>
          <Label>Estimation</Label>
          <Text style={{ fontFamily: SERIF, fontSize: 42, color: C.fg }}>≈ {euro(est.price)}</Text>
          <Body muted>
            {String(est.km).replace(".", ",")} km · {est.minutes} min{est.night ? " · tarif soirée" : ""}. Tarif pilote, à titre indicatif.
          </Body>
        </Card>
      )}
      <ErrorText>{error}</ErrorText>
      <Button title="Commander" onPress={book} busy={busy} disabled={!from || !to} />
      <Text style={{ fontSize: 10, color: C.muted, lineHeight: 14 }}>Adresses : Base Adresse Nationale (Géoplateforme). {PHOTO_CREDITS}</Text>
    </ScrollView>
  );
}

function CurrentRide({ ride, onChange, onClose }: { ride: Ride; onChange: (r: Ride) => void; onClose: () => void }) {
  const [contact, setContact] = React.useState<Contact | null>(null);
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const st = STATUS[ride.status];

  React.useEffect(() => {
    if (!ride.driver_id || ride.status === "cancelled") return setContact(null);
    call<{ contact: Contact | null }>(`/rides/${ride.id}/contact`).then(({ data }) => setContact(data?.contact ?? null));
  }, [ride.id, ride.driver_id, ride.status]);

  // The driver's photo, so the passenger can recognise who picks them up. Only during the ride.
  const showPhoto = !!ride.driver_id && ["accepted", "arriving", "in_progress"].includes(ride.status);
  React.useEffect(() => {
    if (!showPhoto) return setPhoto(null);
    call<{ url: string | null }>(`/rides/${ride.id}/driver-photo`).then(({ data }) => setPhoto(data?.url ? absolute(data.url) : null));
  }, [ride.id, showPhoto]);

  const cancel = async () => {
    setBusy(true);
    setError("");
    const { data, error } = await call<{ ride: Ride }>(`/rides/${ride.id}/cancel`, { method: "POST" });
    setBusy(false);
    if (error || !data) return setError(errorText(error));
    onChange(data.ride);
  };

  // Live driver position, shown while it is fresh (sent in the last 90 seconds).
  const fresh = ride.driver_located_at != null && Date.now() - new Date(ride.driver_located_at).getTime() < 90_000;
  const car = fresh && ride.driver_lat != null && ride.driver_lng != null ? { lat: ride.driver_lat, lng: ride.driver_lng, heading: ride.driver_heading } : null;
  const target = ride.status === "in_progress" ? { lat: ride.dropoff_lat, lng: ride.dropoff_lng } : { lat: ride.pickup_lat, lng: ride.pickup_lng };
  const eta = car && ["accepted", "arriving", "in_progress"].includes(ride.status) ? etaMinutes(car, target) : null;

  const cancelText = ride.status === "cancelled" ? (ride.cancelled_by === "driver" ? "Le chauffeur a annulé la course. Vous pouvez en commander une autre." : "Vous avez annulé cette course.") : st.text;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: RUDDER_SPACE }}>
      <Card dark>
        <Text style={{ color: C.accentOnDark, fontSize: 11, letterSpacing: 1.6, fontWeight: "600", textTransform: "uppercase" }}>Course n° {ride.id}</Text>
        <Text style={{ color: C.boardFg, fontFamily: SERIF, fontSize: 32 }}>{st.title}</Text>
        {eta != null && (
          <Text style={{ color: C.boardFg, fontSize: 17 }}>
            {ride.status === "in_progress" ? "Arrivée prévue dans " : "Votre chauffeur arrive dans "}
            <Text style={{ fontFamily: SERIF, fontSize: 24, color: C.accentOnDark }}>~{eta} min</Text>
          </Text>
        )}
        {!!cancelText && <Text style={{ color: "#B5A898", fontSize: 15 }}>{cancelText}</Text>}
        {ride.status === "requested" && <ActivityIndicator color={C.accentOnDark} style={{ alignSelf: "flex-start" }} />}
      </Card>
      {contact && ride.status !== "completed" && (
        <Card>
          <Label>Votre chauffeur</Label>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            {showPhoto && (
              <View style={{ width: 64, height: 64, borderRadius: 32, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.6)" }}>
                {photo && <Image source={{ uri: photo }} style={{ width: 64, height: 64 }} accessibilityLabel={`Photo de ${contact.first_name}`} />}
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: SERIF, fontSize: 26, color: C.fg }}>{contact.first_name}</Text>
              <Body>
                {contact.vehicle} · <Text style={{ fontWeight: "600", letterSpacing: 1.2 }}>{contact.plate}</Text>
              </Body>
            </View>
          </View>
          {showPhoto && <Body muted>Vérifiez la photo et la plaque avant de monter.</Body>}
        </Card>
      )}
      <MapPreview from={{ lat: ride.pickup_lat, lng: ride.pickup_lng }} to={{ lat: ride.dropoff_lat, lng: ride.dropoff_lng }} car={car} height={190} />
      <Card>
        <RideRoute ride={ride} />
      </Card>
      <ErrorText>{error}</ErrorText>
      {["requested", "accepted", "arriving"].includes(ride.status) && <Button title="Annuler la course" variant="outline" onPress={cancel} busy={busy} />}
      {["completed", "cancelled"].includes(ride.status) && <Button title="Nouvelle course" onPress={onClose} />}
    </ScrollView>
  );
}
