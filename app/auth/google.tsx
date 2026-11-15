import { useEffect, useState } from "react";
import { AntDesign } from "@expo/vector-icons";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useAuthStore } from "@/stores/authStore";

export default function GoogleAuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const continueAsDemoUser = useAuthStore((state) => state.continueAsDemoUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [birthYear, setBirthYear] = useState("");
  const [birthdayThisYear, setBirthdayThisYear] = useState<"yes" | "no" | null>(null);

  // Belt-and-suspenders: whenever the store flips to authenticated (whether
  // from Google sign-in, demo, or any other path) navigate into the app.
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)/scanner");
    }
  }, [isAuthenticated, router]);
  const { signIn, confirmAge, ageChallenge, isLoading, error } = useGoogleAuth();
  const parsedBirthYear = Number(birthYear);
  const canConfirmAge = /^\d{4}$/.test(birthYear) && parsedBirthYear >= 1900 && parsedBirthYear <= new Date().getFullYear() && birthdayThisYear !== null;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: theme.colors.background,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingTop: insets.top + 28,
        paddingBottom: Math.max(insets.bottom, 16) + 16,
        gap: 24,
      }}
    >
      {/* Logo */}
      <View style={{ alignItems: "center", gap: 14 }}>
        <Image source={require("../../assets/images/icon.png")} style={{ width: 88, height: 88, borderRadius: 22 }} />
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text style={{ color: theme.colors.accent, fontSize: 12, fontFamily: theme.fonts.display, letterSpacing: 1.8 }}>
            SAFESCAN QR
          </Text>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 30, fontFamily: theme.fonts.display, textAlign: "center" }}>
            {ageChallenge ? "Confirm your age" : "Continue to SafeScan"}
          </Text>
        </View>
      </View>

      <View style={{ width: "100%", gap: 12 }}>
        {ageChallenge ? (
          <View style={{ gap: 14 }}>
            <Text style={{ color: theme.colors.textSecondary, lineHeight: 21, textAlign: "center" }}>
              Before creating an account, please answer these questions. SafeScan records whether you meet the account age rule, not your birth date.
            </Text>
            <View style={{ gap: 7 }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 15 }}>What year were you born?</Text>
              <TextInput
                accessibilityLabel="Year of birth"
                value={birthYear}
                onChangeText={(value) => setBirthYear(value.replace(/\D/g, "").slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="YYYY"
                placeholderTextColor={theme.colors.textSecondary}
                style={{ minHeight: 52, paddingHorizontal: 16, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, fontSize: 18 }}
              />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={{ color: theme.colors.textPrimary, fontSize: 15 }}>Have you already had your birthday this calendar year?</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(["yes", "no"] as const).map((choice) => (
                  <Pressable
                    key={choice}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: birthdayThisYear === choice }}
                    accessibilityLabel={choice === "yes" ? "Yes, I have had my birthday this year" : "No, I have not had my birthday this year"}
                    onPress={() => setBirthdayThisYear(choice)}
                    style={{ flex: 1, minHeight: 48, borderWidth: 1, borderColor: birthdayThisYear === choice ? theme.colors.accent : theme.colors.border, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: birthdayThisYear === choice ? theme.colors.primaryDim : theme.colors.surface }}
                  >
                    <Text style={{ color: theme.colors.textPrimary, fontSize: 15 }}>{choice === "yes" ? "Yes" : "No"}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!canConfirmAge || isLoading}
              onPress={() => {
                if (birthdayThisYear && canConfirmAge) {
                  const answer = birthdayThisYear;
                  const year = parsedBirthYear;
                  setBirthYear("");
                  setBirthdayThisYear(null);
                  void confirmAge(year, answer);
                }
              }}
              style={{ minHeight: 52, borderRadius: 8, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center", opacity: canConfirmAge && !isLoading ? 1 : 0.5 }}
            >
              <Text style={{ color: "#000", fontFamily: theme.fonts.display, fontSize: 15 }}>Continue</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={continueAsDemoUser} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: theme.colors.textSecondary }}>Continue in demo mode without an account</Text>
            </Pressable>
          </View>
        ) : (
          <>
        {/* Demo entry — always visible */}
        <Pressable
          accessibilityRole="button"
          onPress={continueAsDemoUser}
          style={({ pressed }) => ({
            minHeight: 54,
            borderRadius: 8,
            backgroundColor: theme.colors.accent,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: "#000", fontFamily: theme.fonts.display, fontSize: 15 }}>
            Enter App (Demo)
          </Text>
        </Pressable>

        {/* Real Google sign-in */}
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={signIn}
          style={({ pressed }) => ({
            minHeight: 50,
            borderRadius: 8,
            backgroundColor: theme.colors.textPrimary,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
            opacity: isLoading ? 0.65 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <AntDesign name="google" size={20} color={theme.colors.backgroundEnd} />
          <Text style={{ color: theme.colors.backgroundEnd, fontFamily: theme.fonts.display, fontSize: 14 }}>
            Sign in with Google
          </Text>
        </Pressable>
          </>
        )}

        {isLoading && <ActivityIndicator color={theme.colors.accent} />}
        {error ? (
          <Text style={{ color: theme.colors.danger, fontSize: 13, lineHeight: 19, textAlign: "center" }}>
            {error}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
