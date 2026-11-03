import * as React from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { auth, call, type Profile } from "./src/api";
import { Backdrop, C } from "./src/ui";
import { Welcome } from "./src/screens/Welcome";
import { Reveal } from "./src/screens/Reveal";
import { Login } from "./src/screens/Login";
import { Onboarding } from "./src/screens/Onboarding";
import { Passenger } from "./src/screens/Passenger";
import { Driver } from "./src/screens/Driver";

// One codebase for both apps: the account's role decides which one you see.
// The two store apps (passenger / driver) will be built from this code later.
export default function App() {
  const [session, setSession] = React.useState<boolean | undefined>(undefined);
  const [intro, setIntro] = React.useState(true);
  const [revealed, setRevealed] = React.useState(false);
  const [profile, setProfile] = React.useState<Profile | null | undefined>(undefined);

  React.useEffect(() => {
    auth.signedIn().then(setSession);
    const off = auth.onChange(setSession);
    return () => {
      off();
    };
  }, []);

  const loadProfile = React.useCallback(async () => {
    if (!session) return setProfile(undefined);
    setProfile(undefined);
    const { data, error } = await call<{ profile: Profile | null }>("/me/profile");
    // Offline: keep the spinner and retry instead of sending the user to onboarding.
    if (error) return void setTimeout(loadProfile, 3000);
    setProfile(data?.profile ?? null);
  }, [session]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  let screen: React.ReactNode;
  if (session === undefined || (session && profile === undefined)) screen = <ActivityIndicator style={{ marginTop: 80 }} color={C.primary} />;
  else if (!session) screen = <Login />;
  else if (!profile) screen = <Onboarding onDone={loadProfile} />;
  else screen = profile.role === "driver" ? <Driver profile={profile} /> : <Passenger profile={profile} />;

  return (
    <SafeAreaProvider>
      <Backdrop>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <View style={{ flex: 1 }}>{screen}</View>
        </SafeAreaView>
        {session === false && !revealed && <Reveal onDone={() => setRevealed(true)} />}
        {intro && <Welcome onDone={() => setIntro(false)} />}
      </Backdrop>
    </SafeAreaProvider>
  );
}
