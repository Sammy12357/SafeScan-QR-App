import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";
import { fetchReferralStatus, type ReferralResponse } from "@/services/api";

export function ReferralCard() {
  const [copied, setCopied] = useState(false);
  const [referral, setReferral] = useState<ReferralResponse | null>(null);
  const link = referral?.link ?? "https://safescan-qr.onrender.com";

  useEffect(() => {
    fetchReferralStatus().then(setReferral).catch(() => undefined);
  }, []);

  return (
    <Card style={{ gap: 10 }}>
      <Text style={{ ...theme.typography.eyebrow, fontSize: 11 }}>step2</Text>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontFamily: theme.fonts.sansSemiBold }}>Referral link</Text>
      <Text style={{ color: theme.colors.textSecondary, lineHeight: 22 }}>Invite users and unlock SQR tier bonuses. {referral ? `${referral.referrals} counted so far.` : ""}</Text>
      <View style={{ borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12, padding: 12 }}>
        <Text style={{ color: theme.colors.accent }}>{link}</Text>
      </View>
      <Button
        title={copied ? "Copied" : "Copy Referral Link"}
        variant="secondary"
        onPress={async () => {
          await Clipboard.setStringAsync(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
      />
    </Card>
  );
}
