import * as React from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";
import { auth, call, errorText, type Profile } from "../api";
import { Body, Button, C, Card, ErrorText, Label, SERIF, Title } from "../ui";
import { RUDDER_SPACE } from "./Rudder";

export function Account({ profile, extra }: { profile: Profile; extra?: React.ReactNode }) {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    call<{ user: { email: string } }>("/auth/me").then(({ data }) => setEmail(data?.user.email ?? ""));
  }, []);

  // Store requirement and GDPR: the account can be deleted from inside the app.
  const remove = async () => {
    setBusy(true);
    setError("");
    const err = await auth.deleteAccount();
    setBusy(false);
    if (err) setError(err.message === "ride_in_progress" ? "Terminez ou annulez votre course avant de supprimer le compte." : errorText(err));
  };
  const confirmRemove = () => {
    const msg = "Votre compte, vos courses et vos informations seront effacés définitivement.";
    if (Platform.OS === "web") return window.confirm(`Supprimer mon compte ? ${msg}`) && remove();
    Alert.alert("Supprimer mon compte ?", msg, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: remove },
    ]);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: RUDDER_SPACE }}>
      <Title>Compte</Title>
      <Card>
        <Label>{profile.role === "driver" ? "Chauffeur" : "Passager"}</Label>
        <Text style={{ fontFamily: SERIF, fontSize: 28, color: C.fg }}>{profile.first_name}</Text>
        {!!email && <Body muted>{email}</Body>}
      </Card>
      {extra}
      <Card>
        <Label>Version pilote</Label>
        <Body muted>MOVA est en test à Besançon. Pour toute question, écrivez à l'équipe MOVA.</Body>
      </Card>
      <View style={{ marginTop: 8 }}>
        <Button title="Se déconnecter" variant="outline" onPress={() => auth.signOut()} />
      </View>
      <ErrorText>{error}</ErrorText>
      <Button title="Supprimer mon compte" variant="outline" busy={busy} onPress={confirmRemove} />
    </ScrollView>
  );
}
