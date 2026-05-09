import { useCallback, useState } from "react";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { PublicKey } from "@solana/web3.js";
import { toUint8Array } from "js-base64";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

const appIdentity = {
  name: "SafeScan QR",
  uri: "https://safescan-qr.onrender.com"
};

export function useWallet() {
  const publicKey = useAuthStore((state) => state.walletAddress);
  const setWalletAddress = useAuthStore((state) => state.setWalletAddress);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const nextPublicKey = await transact(async (wallet) => {
        const authorization = await wallet.authorize({
          identity: appIdentity,
          chain: "solana:mainnet"
        });
        const account = authorization.accounts[0];
        if (!account) throw new Error("No Solana wallet account was selected.");
        return new PublicKey(toUint8Array(account.address)).toBase58();
      });

      await api.wallet.connect(nextPublicKey);
      setWalletAddress(nextPublicKey);
    } finally {
      setIsConnecting(false);
    }
  }, [setWalletAddress]);

  const disconnect = useCallback(() => {
    setWalletAddress(null);
    api.wallet.disconnect().catch(() => undefined);
  }, [setWalletAddress]);

  return {
    connect,
    disconnect,
    publicKey,
    isConnected: Boolean(publicKey),
    isConnecting
  };
}
