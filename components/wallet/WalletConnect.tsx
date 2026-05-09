import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { theme } from "@/constants/theme";
import { disconnectWallet, fetchWalletStatus, requestWalletNonce, verifyWallet, type WalletStatusResponse } from "@/services/api";
import { truncateMiddle } from "@/utils/url";

export function WalletConnect() {
  const [wallet, setWallet] = useState<WalletStatusResponse | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [challenge, setChallenge] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = async () => {
    try {
      setWallet(await fetchWalletStatus());
    } catch {
      setWallet({ connected: false });
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const connected = Boolean(wallet?.connected && wallet.walletAddress);

  return (
    <Card style={{ gap: 10 }}>
      <Text style={{ ...theme.typography.eyebrow, fontSize: 11 }}>step1</Text>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontFamily: theme.fonts.sansSemiBold }}>Solana wallet</Text>
      <Text style={{ color: theme.colors.textSecondary, lineHeight: 22 }}>
        {connected ? "Verified on the SafeScan backend for SQR airdrop eligibility." : "Connect a Solana wallet by signing a SafeScan challenge. No transaction is sent."}
      </Text>
      {connected ? (
        <View style={{ borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, padding: 12, gap: 8 }}>
          <Text style={{ color: theme.colors.accent }}>{truncateMiddle(wallet?.walletAddress ?? "", 28)}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{wallet?.onchain?.walletAgeDays ? `${wallet.onchain.walletAgeDays} days old` : "On-chain refresh runs after verification."}</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Input value={walletAddress} onChangeText={setWalletAddress} placeholder="Solana wallet address" autoCapitalize="none" />
          {challenge ? (
            <View style={{ borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, padding: 12, gap: 8 }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 }}>{challenge}</Text>
              <Button title="Copy Challenge" variant="secondary" onPress={() => Clipboard.setStringAsync(challenge)} />
            </View>
          ) : null}
          {challenge ? <Input value={signature} onChangeText={setSignature} placeholder="Paste wallet signature" autoCapitalize="none" /> : null}
        </View>
      )}
      {message ? <Text style={{ color: message.includes("failed") || message.includes("Invalid") ? theme.colors.danger : theme.colors.safe, fontSize: 12 }}>{message}</Text> : null}
      {busy ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {connected ? (
        <View style={{ gap: 10 }}>
          <Button title="View on Solscan" variant="secondary" onPress={() => wallet?.walletAddress && Linking.openURL(`https://solscan.io/account/${wallet.walletAddress}`)} />
          <Button
            title="Disconnect Wallet"
            variant="secondary"
            onPress={async () => {
              setBusy(true);
              setMessage("");
              try {
                await disconnectWallet();
                setWallet({ connected: false });
                setMessage("Wallet disconnected.");
              } catch {
                setMessage("Wallet disconnect failed.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </View>
      ) : (
        <Button
          title={challenge ? "Verify Signature" : "Request Wallet Challenge"}
          variant="secondary"
          disabled={busy || !walletAddress || (Boolean(challenge) && !signature)}
          onPress={async () => {
            setBusy(true);
            setMessage("");
            try {
              if (!challenge) {
                const response = await requestWalletNonce(walletAddress);
                setChallenge(response.message);
                setMessage("Challenge created. Sign it in your Solana wallet, then paste the signature here.");
              } else {
                await verifyWallet(walletAddress, signature);
                setMessage("Wallet verified.");
                setChallenge("");
                setSignature("");
                await refresh();
              }
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Wallet verification failed.");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </Card>
  );
}
