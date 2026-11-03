import * as React from "react";
import { ScrollView, View } from "react-native";
import { CATEGORIES } from "../places";
import { call, errorText, type CategoryId, type Role } from "../api";
import { Body, Button, Chip, ErrorText, Field, Label, Title } from "../ui";

// First launch: choose passenger or driver (once per account), then the minimum details.
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [role, setRole] = React.useState<Role | null>(null);
  const [firstName, setFirstName] = React.useState("");
  const [vehicle, setVehicle] = React.useState("");
  const [plate, setPlate] = React.useState("");
  const [category, setCategory] = React.useState<CategoryId>("standard");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const save = async () => {
    if (!role || !firstName.trim()) return setError("Indiquez votre prénom.");
    if (role === "driver" && (vehicle.trim().length < 2 || plate.trim().length < 4)) return setError("Indiquez votre véhicule et votre plaque.");
    setBusy(true);
    setError("");
    const { error: e1 } = await call("/me/profile", {
      method: "POST",
      body: { role, first_name: firstName.trim(), ...(role === "driver" ? { vehicle: vehicle.trim(), plate: plate.trim().toUpperCase(), category } : {}) },
    });
    setBusy(false);
    if (e1) return setError(e1.message === "bad_request" ? "Vérifiez les informations saisies." : errorText(e1));
    onDone();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingTop: 40 }} keyboardShouldPersistTaps="handled">
      <Title>Bienvenue</Title>
      <View style={{ gap: 10 }}>
        <Label>Vous êtes</Label>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Chip label="Passager" active={role === "passenger"} onPress={() => setRole("passenger")} />
          <Chip label="Chauffeur VTC" active={role === "driver"} onPress={() => setRole("driver")} />
        </View>
        {role && <Body muted>Ce choix est définitif pour ce compte. Utilisez un autre e-mail pour l'autre rôle.</Body>}
      </View>
      {role && (
        <>
          <Field label="Prénom" value={firstName} onChangeText={setFirstName} autoComplete="given-name" textContentType="givenName" />
          {role === "driver" && (
            <>
              <Field label="Véhicule (marque et modèle)" value={vehicle} onChangeText={setVehicle} placeholder="Toyota Corolla" />
              <Field label="Plaque d'immatriculation" value={plate} onChangeText={setPlate} autoCapitalize="characters" placeholder="AB-123-CD" />
              <View style={{ gap: 10 }}>
                <Label>Catégorie</Label>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {CATEGORIES.map((c) => (
                    <Chip key={c.id} label={c.label} active={category === c.id} onPress={() => setCategory(c.id)} />
                  ))}
                </View>
              </View>
              <Body muted>
                MOVA validera votre compte après vérification de vos documents (carte VTC, assurance) en dehors de l'application. Ne les envoyez pas ici.
              </Body>
            </>
          )}
          <ErrorText>{error}</ErrorText>
          <Button title="Continuer" onPress={save} busy={busy} />
        </>
      )}
    </ScrollView>
  );
}
