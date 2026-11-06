import * as React from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { C, Glass, SERIF, Wordmark } from "../ui";
import { supabase } from "../supabase";

const GLOBE = require("../../assets/welcome-globe.jpg");
const SITE = "https://skynovaagency1-web.github.io/Mova";

// E-mail + password sign-in. The pilot runs without a custom e-mail service, so Supabase's
// "Confirm email" setting is off; one-time codes come back once a sending service is connected.
export function Login() {
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const switchTo = (m: "signin" | "signup") => {
    setMode(m);
    setError("");
    setNotice("");
  };

  const submit = async () => {
    const e = email.trim().toLowerCase();
    setError("");
    setNotice("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return setError("Adresse e-mail invalide.");
    if (password.length < 8) return setError("Mot de passe : 8 caractères minimum.");
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: e, password });
      setBusy(false);
      if (error) setError(error.status === 429 ? "Trop de tentatives. Réessayez dans quelques minutes." : "E-mail ou mot de passe incorrect.");
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email: e, password });
    setBusy(false);
    if (error) {
      if (/already|registered|exists/i.test(error.message)) return setError("Un compte existe déjà avec cet e-mail. Connectez-vous.");
      if (/password/i.test(error.message)) return setError("Mot de passe trop faible. Choisissez-en un plus long.");
      return setError("Création du compte impossible. Réessayez.");
    }
    if (!data.session) setNotice("Compte créé. Confirmez votre adresse via l'e-mail reçu, puis connectez-vous.");
  };

  return (
    <View style={{ flex: 1 }}>
      <Image source={GLOBE} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]} />
      <LinearGradient colors={["rgba(244,239,234,0)", "rgba(223,212,201,0.9)"]} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
          <View style={g.wrap}>
            <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(251,248,245,0.5)" }]} />
            <View style={{ padding: 22, gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Wordmark size={15} color={C.muted} />
                <Pressable accessibilityRole="button" hitSlop={10} onPress={() => switchTo(mode === "signin" ? "signup" : "signin")}>
                  <Text style={{ fontSize: 15, color: C.fg }}>{mode === "signin" ? "Créer un compte" : "Se connecter"}</Text>
                </Pressable>
              </View>

              <Text style={{ fontFamily: SERIF, fontSize: 34, color: C.fg, marginTop: 18, marginBottom: 6 }}>
                {mode === "signin" ? "Connexion" : "Inscription"}
              </Text>

              <Pill icon="@" accessibilityLabel="Adresse e-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="adresse e-mail" />
              <Pill
                icon="✱"
                accessibilityLabel="Mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                textContentType={mode === "signup" ? "newPassword" : "password"}
                placeholder={mode === "signup" ? "mot de passe (8+ caractères)" : "mot de passe"}
                action={mode === "signin" ? { label: "Oublié", onPress: () => setNotice("Pendant le pilote, écrivez à l'équipe MovaaGo pour réinitialiser votre mot de passe.") } : undefined}
              />

              {!!error && <Text style={{ color: C.warning, fontWeight: "500" }}>{error}</Text>}
              {!!notice && <Text style={{ color: C.fg, lineHeight: 20 }}>{notice}</Text>}

              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 6 }}>
                <Text style={{ flex: 1, fontSize: 11, lineHeight: 15, color: C.muted }}>
                  {mode === "signup" ? (
                    <>
                      En créant un compte, vous acceptez les{" "}
                      <Text style={{ textDecorationLine: "underline" }} onPress={() => Linking.openURL(`${SITE}/cgu.html`)}>conditions d'utilisation</Text> et la{" "}
                      <Text style={{ textDecorationLine: "underline" }} onPress={() => Linking.openURL(`${SITE}/confidentialite.html`)}>politique de confidentialité</Text>.
                    </>
                  ) : (
                    "Version pilote à Besançon. Vos données servent uniquement à vos courses."
                  )}
                </Text>
                <Pressable accessibilityRole="button" accessibilityLabel={mode === "signup" ? "Créer mon compte" : "Se connecter"} onPress={submit} disabled={busy}>
                  {({ pressed }) => (
                    <Glass tint="sand" style={{ width: 72, height: 52, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.96 : 1 }] }}>
                      {busy ? <ActivityIndicator color={C.fg} /> : <Text style={{ color: C.fg, fontSize: 26, marginTop: -3 }}>›</Text>}
                    </Glass>
                  )}
                </Pressable>
              </View>
            </View>
          </View>

          <Pressable accessibilityRole="button" onPress={() => switchTo("signup")} style={({ pressed }) => [g.dark, { opacity: pressed ? 0.92 : 1 }]}>
            <Text style={{ color: "#fff", fontFamily: SERIF, fontSize: 30 }}>Nouveau ici</Text>
            <Text style={{ color: "#A99B8D", fontSize: 18 }}>Taxi et VTC à prix connu</Text>
            <Text style={{ color: "#fff", fontSize: 15, alignSelf: "flex-end", marginTop: 18 }}>Créer un compte</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Pill({ icon, action, ...props }: TextInputProps & { icon: string; action?: { label: string; onPress: () => void } }) {
  return (
    <Glass style={g.pill}>
      <Glass style={g.icon}>
        <Text style={{ color: C.fg, fontSize: 14 }}>{icon}</Text>
      </Glass>
      <TextInput placeholderTextColor="#8A7B6E" style={{ flex: 1, minWidth: 0, fontSize: 16, color: C.fg, paddingVertical: 0 }} {...props} />
      {action && (
        <Pressable accessibilityRole="button" onPress={action.onPress} style={g.action} hitSlop={6}>
          <Text style={{ fontSize: 12, color: C.fg }}>{action.label}</Text>
        </Pressable>
      )}
    </Glass>
  );
}

const g = StyleSheet.create({
  wrap: { borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.7)" },
  pill: { flexDirection: "row", alignItems: "center", gap: 12, height: 54, paddingHorizontal: 6 },
  icon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  action: { paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  dark: { borderRadius: 28, backgroundColor: "#2C251D", padding: 22, gap: 2 },
});
