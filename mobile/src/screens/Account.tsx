import * as React from "react";
import { ScrollView, Text, View } from "react-native";
import { supabase, type Profile } from "../supabase";
import { Body, Button, C, Card, Label, SERIF, Title } from "../ui";
import { RUDDER_SPACE } from "./Rudder";

export function Account({ profile, extra }: { profile: Profile; extra?: React.ReactNode }) {
  const [email, setEmail] = React.useState("");
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);
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
        <Body muted>MovaaGo est en test à Besançon. Pour toute question, écrivez à l'équipe MovaaGo.</Body>
      </Card>
      <View style={{ marginTop: 8 }}>
        <Button title="Se déconnecter" variant="outline" onPress={() => supabase.auth.signOut()} />
      </View>
    </ScrollView>
  );
}
