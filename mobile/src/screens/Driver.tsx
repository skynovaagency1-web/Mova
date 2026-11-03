import * as React from "react";
import { ActivityIndicator, Linking, Platform, RefreshControl, ScrollView, Text, View } from "react-native";
import { usePolling } from "../hooks";
import { call, errorText, type Contact, type Driver as DriverRow, type Profile, type Ride } from "../api";
import { Body, Button, C, Card, ErrorText, Label, SERIF, Title } from "../ui";
import { Header } from "./Header";
import { RideRoute } from "./RideRoute";
import { MapPreview } from "./MapPreview";
import { useShareLocation } from "./useShareLocation";
import { Account } from "./Account";
import { DriverPhoto } from "./DriverPhoto";
import { Rudder, RUDDER_SPACE } from "./Rudder";

const NEXT: Partial<Record<Ride["status"], { status: Ride["status"]; label: string; title: string }>> = {
  accepted: { status: "arriving", label: "Je pars chercher le passager", title: "Course acceptée" },
  arriving: { status: "in_progress", label: "Passager à bord", title: "En route vers le passager" },
  in_progress: { status: "completed", label: "Terminer la course", title: "Course en cours" },
};

export function Driver({ profile }: { profile: Profile }) {
  const [driver, setDriver] = React.useState<DriverRow | null | undefined>(undefined);
  const [ride, setRide] = React.useState<Ride | null>(null);
  const [requests, setRequests] = React.useState<Ride[]>([]);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"rides" | "account">("rides");

  const load = React.useCallback(async () => {
    // One call: the driver record, their active ride, and open requests while online and free.
    const { data, error } = await call<{ driver: DriverRow | null; ride: Ride | null; requests: Ride[] }>("/driver");
    if (error || !data) return; // offline: keep what is on screen, the next poll retries
    setDriver(data.driver);
    setRide(data.ride);
    setRequests(data.requests);
  }, []);

  usePolling(load, driver?.online || ride ? 4000 : 20000);

  const run = async (key: string, fn: () => PromiseLike<{ error: unknown }>) => {
    setBusy(key);
    setError("");
    const { error } = await fn();
    setBusy(null);
    if (error) setError(errorText(error));
    await load();
  };

  const header = <Header name={profile.first_name} subtitle="Chauffeur" />;
  if (driver === undefined) return <View style={{ flex: 1 }}>{header}<ActivityIndicator style={{ marginTop: 40 }} color={C.primary} /></View>;

  if (!driver) {
    return (
      <View style={{ flex: 1 }}>
        {header}
        <View style={{ padding: 20 }}><Body>Profil chauffeur introuvable. Contactez MOVA.</Body></View>
      </View>
    );
  }

  const rudder = (
    <Rudder
      left={{ icon: "list", label: "Courses", active: tab === "rides", onPress: () => setTab("rides") }}
      center={{
        icon: "power",
        label: driver.online ? "Passer hors ligne" : "Passer en ligne",
        tint: driver.online ? "sage" : "sand",
        busy: busy === "online",
        disabled: !driver.approved || !!ride,
        onPress: () => run("online", () => call("/driver", { method: "PATCH", body: { online: !driver.online } })),
      }}
      right={{ icon: "person", label: "Compte", active: tab === "account", onPress: () => setTab("account") }}
    />
  );

  if (tab === "account")
    return (
      <View style={{ flex: 1 }}>
        {header}
        <Account profile={profile} extra={<><DriverPhoto driver={driver} onChanged={load} /><Card><Label>Véhicule</Label><Body>{driver.vehicle} · {driver.plate}</Body></Card></>} />
        {rudder}
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      {header}
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: RUDDER_SPACE }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
        {!driver.approved ? (
          <>
            <Card>
              <Title style={{ fontSize: 22 }}>Compte en attente de validation</Title>
              <Body muted>
                {driver.photo_path
                  ? `MOVA vérifie en personne votre identité, votre carte VTC, vos assurances et votre véhicule (${driver.vehicle}, ${driver.plate}). Vous pourrez passer en ligne dès la validation. Tirez vers le bas pour actualiser.`
                  : "Première étape : ajoutez votre photo ci-dessous. MOVA vérifiera ensuite en personne votre identité, votre carte VTC, vos assurances et votre véhicule."}
              </Body>
            </Card>
            {!driver.photo_path && <DriverPhoto driver={driver} onChanged={load} />}
          </>
        ) : (
          <Card dark style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: driver.online ? "#B5BE98" : "#6B5E51" }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.boardFg, fontFamily: SERIF, fontSize: 26 }}>{driver.online ? "En ligne" : "Hors ligne"}</Text>
              <Text style={{ color: "#B5A898" }}>{driver.online ? "Vous recevez les demandes." : "Touchez le bouton central pour passer en ligne."}</Text>
            </View>
          </Card>
        )}
        <ErrorText>{error}</ErrorText>
        {ride ? (
          <ActiveRide ride={ride} busy={busy} run={run} />
        ) : driver.online ? (
          <View style={{ gap: 12 }}>
            <Label>Demandes à proximité ({requests.length})</Label>
            {requests.length === 0 && <Body muted>Aucune demande pour le moment. La liste s'actualise toute seule.</Body>}
            {requests.map((r) => (
              <Card key={r.id}>
                <RideRoute ride={r} />
                <Button title="Accepter" busy={busy === `accept-${r.id}`} onPress={() => run(`accept-${r.id}`, () => call(`/rides/${r.id}/accept`, { method: "POST" }))} />
              </Card>
            ))}
          </View>
        ) : driver.approved ? (
          <Body muted>Passez en ligne pour recevoir des demandes de course.</Body>
        ) : null}
      </ScrollView>
      {rudder}
    </View>
  );
}

function ActiveRide({ ride, busy, run }: { ride: Ride; busy: string | null; run: (k: string, fn: () => PromiseLike<{ error: unknown }>) => Promise<void> }) {
  const [contact, setContact] = React.useState<Contact | null>(null);
  const next = NEXT[ride.status];

  React.useEffect(() => {
    call<{ contact: Contact | null }>(`/rides/${ride.id}/contact`).then(({ data }) => setContact(data?.contact ?? null));
  }, [ride.id]);

  const sharing = useShareLocation(["accepted", "arriving", "in_progress"].includes(ride.status) ? ride.id : null);

  // Before pick-up the driver navigates to the passenger, afterwards to the destination.
  const toPickup = ride.status === "accepted" || ride.status === "arriving";
  const dest = toPickup ? { lat: ride.pickup_lat, lng: ride.pickup_lng } : { lat: ride.dropoff_lat, lng: ride.dropoff_lng };
  const navigate = () => {
    const ll = `${dest.lat},${dest.lng}`;
    Linking.openURL(Platform.OS === "ios" ? `https://maps.apple.com/?daddr=${ll}&dirflg=d` : `https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=driving`);
  };

  return (
    <View style={{ gap: 12 }}>
      <MapPreview
        from={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
        to={{ lat: ride.dropoff_lat, lng: ride.dropoff_lng }}
        car={ride.driver_lat != null && ride.driver_lng != null ? { lat: ride.driver_lat, lng: ride.driver_lng, heading: ride.driver_heading } : null}
        height={180}
      />
      <Text style={{ fontSize: 12, color: sharing === "sharing" ? C.muted : C.warning, paddingHorizontal: 4 }}>
        {sharing === "sharing"
          ? "● Position partagée avec le passager. Gardez MOVA ouvert pendant la course."
          : sharing === "denied"
            ? "Autorisez la localisation dans Réglages pour que le passager vous voie arriver."
            : sharing === "error"
              ? "Position non envoyée. Vérifiez la connexion."
              : "Activation du partage de position…"}
      </Text>
      {ride.status !== "completed" && ride.status !== "cancelled" && (
        <Button title={toPickup ? "Itinéraire vers le passager" : "Itinéraire vers la destination"} variant="outline" onPress={navigate} />
      )}
      <Card>
        <Label>{next?.title ?? "Course"} · n° {ride.id}</Label>
        <Text style={{ fontFamily: SERIF, fontSize: 26, color: C.fg }}>Passager : {contact?.first_name ?? "…"}</Text>
        <RideRoute ride={ride} />
      </Card>
      {next && (
        <Button
          title={next.label}
          variant={next.status === "completed" ? "signal" : "primary"}
          busy={busy === "advance"}
          onPress={() => run("advance", () => call(`/rides/${ride.id}/advance`, { method: "POST", body: { status: next.status } }))}
        />
      )}
      {(ride.status === "accepted" || ride.status === "arriving") && (
        <Button title="Annuler la course" variant="outline" busy={busy === "cancel"} onPress={() => run("cancel", () => call(`/rides/${ride.id}/cancel`, { method: "POST" }))} />
      )}
    </View>
  );
}
