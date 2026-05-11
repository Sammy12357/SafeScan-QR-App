import { useCallback, useState } from "react";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { PublicKey } from "@solana/web3.js";
// `bs58` ships without TypeScript types; import the JS module and type the
// surface we use locally so we don't need to add @types/bs58.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bs58: { encode: (input: Uint8Array) => string; decode: (input: string) => Uint8Array } = require("bs58");
import { fromUint8Array, toUint8Array } from "js-base64";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

const appIdentity = {
  name: "SafeScan QR",
  uri: "https://safescan-qr.onrender.com"
};

function utf8ToBytes(value: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value);
  }
  // Fallback for environments without TextEncoder.
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) bytes[i] = value.charCodeAt(i) & 0xff;
  return bytes;
}

// Mobile Wallet Adapter `signMessages` returns the full payload (message bytes
// followed by a 64-byte Ed25519 signature) base64-encoded. The backend wants the
// signature alone, base58-encoded. Pull the trailing 64 bytes off and encode.
function extractBase58Signature(signedPayloadB64: string): string {
  const signedBytes = toUint8Array(signedPayloadB64);
  if (signedBytes.length < 64) {
    throw new Error("Wallet returned a malformed signature.");
  }
  const signature = signedBytes.slice(signedBytes.length - 64);
  return bs58.encode(signature);
}

function isNetworkRequestError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("network request failed") || message.includes("failed to fetch") || message.includes("networkerror") || message.includes("aborted");
}

function normalizeWalletError(error: unknown) {
  if (isNetworkRequestError(error)) {
    return new Error("Phantom opened, but SafeScan could not reach backend wallet verification. Check the emulator internet connection and try again.");
  }
  return error;
}

function getSignedPayload(signResponse: unknown) {
  const response = signResponse as { signed_payloads?: string[]; signedPayloads?: string[] };
  return response.signed_payloads?.[0] ?? response.signedPayloads?.[0];
}

export function useWallet() {
  const publicKey = useAuthStore((state) => state.walletAddress);
  const setWalletAddress = useAuthStore((state) => state.setWalletAddress);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    // The backend's wallet endpoints (/api/wallet/nonce, /api/wallet/verify)
    // require an authenticated session. Surface a clear error so the UI can
    // route the user through Google sign-in before launching Phantom.
    if (!isAuthenticated || userId === "demo-user") {
      throw new Error("Sign in with Google before connecting a Solana wallet.");
    }

    setIsConnecting(true);
    let authorizedWalletAddress: string | null = null;
    try {
      await transact(async (wallet) => {
        const authorization = await wallet.authorize({
          identity: appIdentity,
          chain: "solana:mainnet"
        });
        const account = authorization.accounts[0];
        if (!account) throw new Error("No Solana wallet account was selected.");

        const walletAddress = new PublicKey(toUint8Array(account.address)).toBase58();
        authorizedWalletAddress = walletAddress;

        // 1. Ask the backend for a one-time challenge to sign.
        const challenge = await api.wallet.nonce(walletAddress);

        // 2. Have Phantom (or any MWA-compatible wallet) sign the challenge.
        const signResponse = await wallet.signMessages({
          addresses: [account.address],
          payloads: [fromUint8Array(utf8ToBytes(challenge.message))]
        });
        const signedPayload = getSignedPayload(signResponse);
        if (!signedPayload) throw new Error("Wallet did not return a signature.");

        const signatureBase58 = extractBase58Signature(signedPayload);

        // 3. Submit the signature to the backend so it can verify ownership.
        await api.wallet.verify(walletAddress, signatureBase58);

        setWalletAddress(walletAddress);
      });
    } catch (error) {
      if (authorizedWalletAddress && isNetworkRequestError(error)) {
        setWalletAddress(authorizedWalletAddress);
        return;
      }
      throw normalizeWalletError(error);
    } finally {
      setIsConnecting(false);
    }
  }, [isAuthenticated, setWalletAddress, userId]);

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
