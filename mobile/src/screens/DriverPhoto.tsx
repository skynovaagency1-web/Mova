import * as React from "react";
import { Alert, Image, Platform, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { errorText, supabase, type Driver } from "../supabase";
import { Body, Button, C, Card, ErrorText, Label, SERIF } from "../ui";

const BUCKET = "mova-driver-photos";

// Short-lived link to a photo in the private bucket. Null while loading or when there is none.
export function useSignedPhoto(path: string | null | undefined) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    setUrl(null);
    if (!path) return;
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data }) => alive && setUrl(data?.signedUrl ?? null));
    return () => {
      alive = false;
    };
  }, [path]);
  return url;
}

function toBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Required driver photo, shown to passengers once a ride is accepted. Taken live with the front
// camera so it is a real, current picture; MovaaGo staff compare it with the ID seen in person.
export function DriverPhoto({ driver, onChanged }: { driver: Driver; onChanged: () => void }) {
  const url = useSignedPhoto(driver.photo_path);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const take = async () => {
    setError("");
    let result: ImagePicker.ImagePickerResult;
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true };
    if (Platform.OS === "web") {
      result = await ImagePicker.launchImageLibraryAsync(opts);
    } else {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError("Autorisez l'appareil photo dans les réglages pour ajouter votre photo.");
      result = await ImagePicker.launchCameraAsync({ ...opts, cameraType: ImagePicker.CameraType.front });
    }
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64) return;

    setBusy(true);
    const path = `${driver.user_id}/${Date.now()}.jpg`;
    const up = await supabase.storage.from(BUCKET).upload(path, toBytes(asset.base64), { contentType: "image/jpeg", upsert: false });
    if (up.error) {
      setBusy(false);
      return setError("Envoi de la photo impossible. Réessayez.");
    }
    const { error } = await supabase.rpc("mova_set_driver_photo", { p_path: path });
    setBusy(false);
    if (error) return setError(errorText(error));
    onChanged();
  };

  const confirmTake = () => {
    if (!driver.approved) return take();
    const msg = "Une nouvelle photo doit être vérifiée par MovaaGo. Vous serez hors ligne jusqu'à la nouvelle validation.";
    if (Platform.OS === "web") return window.confirm(msg) && take();
    Alert.alert("Changer de photo ?", msg, [
      { text: "Annuler", style: "cancel" },
      { text: "Continuer", onPress: take },
    ]);
  };

  return (
    <Card>
      <Label>Photo du chauffeur</Label>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" }}>
          {url ? (
            <Image source={{ uri: url }} style={{ width: 84, height: 84 }} accessibilityLabel="Votre photo" />
          ) : (
            <Text style={{ fontFamily: SERIF, fontSize: 30, color: C.muted }}>{driver.photo_path ? "…" : "?"}</Text>
          )}
        </View>
        <Body muted style={{ flex: 1 }}>
          {driver.photo_path
            ? "Montrée au passager quand vous acceptez sa course, pour qu'il vous reconnaisse."
            : "Obligatoire. Une photo nette de votre visage, de face, sans lunettes de soleil. Le passager la verra quand vous acceptez sa course."}
        </Body>
      </View>
      <ErrorText>{error}</ErrorText>
      <Button title={driver.photo_path ? "Changer de photo" : "Prendre ma photo"} variant={driver.photo_path ? "outline" : "primary"} busy={busy} onPress={confirmTake} />
    </Card>
  );
}
