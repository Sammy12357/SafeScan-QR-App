import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { api, SafeScanApiError } from "@/services/api";
import { useAdultChallengeStore } from "@/stores/adultChallengeStore";
import { useAuthStore } from "@/stores/authStore";

export function AdultAgeModal() {
  const insets = useSafeAreaInsets();
  const challenge = useAdultChallengeStore((state) => state.challenge);
  const dismiss = useAdultChallengeStore((state) => state.dismiss);
  const adultConfirmed = useAuthStore((state) => state.adultConfirmed);
  const [birthYear, setBirthYear] = useState("");
  const [birthdayThisYear, setBirthdayThisYear] = useState<"yes" | "no" | null>(null);
  const [attested, setAttested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBirthYear("");
    setBirthdayThisYear(null);
    setAttested(false);
    setError(null);
  }, [challenge?.ageTicket]);

  const year = Number(birthYear);
  const canSubmit = /^\d{4}$/.test(birthYear) && year >= 1900 && year <= new Date().getFullYear() && birthdayThisYear !== null && attested && !isSubmitting;

  const submit = async () => {
    if (!challenge || !birthdayThisYear || !canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.auth.confirmAdult(challenge.ageTicket, year, birthdayThisYear);
      dismiss();
      adultConfirmed();
    } catch (failure) {
      const status = failure instanceof SafeScanApiError ? failure.status : 0;
      if (status === 403) {
        dismiss();
        Alert.alert("Adults only", "This feature is available to adults only.");
      } else if (status === 410) {
        dismiss();
        Alert.alert("Check expired", "Try the feature again to start a new age check.");
      } else {
        setError("Could not confirm your age. Check your answer and try again.");
      }
    } finally {
      setBirthYear("");
      setBirthdayThisYear(null);
      setAttested(false);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={Boolean(challenge)} transparent animationType="fade" onRequestClose={dismiss} accessibilityViewIsModal>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.78)", justifyContent: "center" }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}>
          <View style={{ backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12, padding: 22, gap: 16 }}>
            <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 22 }}>Confirm your age</Text>
            <Text style={{ color: theme.colors.textSecondary, lineHeight: 21 }}>
              This feature is for adults. SafeScan records only whether you meet the age rule, not your birth date.
            </Text>
            <View style={{ gap: 7 }}>
              <Text style={{ color: theme.colors.textPrimary }}>What year were you born?</Text>
              <TextInput
                accessibilityLabel="Year of birth"
                value={birthYear}
                onChangeText={(value) => setBirthYear(value.replace(/\D/g, "").slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="YYYY"
                placeholderTextColor={theme.colors.textSecondary}
                style={{ minHeight: 50, paddingHorizontal: 14, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, fontSize: 18 }}
              />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={{ color: theme.colors.textPrimary }}>Have you already had your birthday this calendar year?</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(["yes", "no"] as const).map((choice) => (
                  <Pressable
                    key={choice}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: birthdayThisYear === choice }}
                    accessibilityLabel={choice === "yes" ? "Yes, I have had my birthday this year" : "No, I have not had my birthday this year"}
                    onPress={() => setBirthdayThisYear(choice)}
                    style={{ flex: 1, minHeight: 48, borderWidth: 1, borderColor: birthdayThisYear === choice ? theme.colors.accent : theme.colors.border, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ color: theme.colors.textPrimary }}>{choice === "yes" ? "Yes" : "No"}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: attested }}
              onPress={() => setAttested(!attested)}
              style={{ flexDirection: "row", alignItems: "center", minHeight: 48, gap: 10 }}
            >
              <Text style={{ color: theme.colors.accent, fontSize: 20 }}>{attested ? "☑" : "☐"}</Text>
              <Text style={{ color: theme.colors.textPrimary, flex: 1, lineHeight: 20 }}>I confirm that my answers are accurate.</Text>
            </Pressable>
            {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              disabled={!canSubmit}
              onPress={() => void submit()}
              style={{ minHeight: 50, borderRadius: 8, backgroundColor: theme.colors.accent, opacity: canSubmit ? 1 : 0.5, alignItems: "center", justifyContent: "center" }}
            >
              {isSubmitting ? <ActivityIndicator color="#000" /> : <Text style={{ color: "#000", fontFamily: theme.fonts.display }}>Confirm and continue</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" onPress={dismiss} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: theme.colors.textSecondary }}>Not now</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
