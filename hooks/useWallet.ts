import { useCallback, useEffect, useState } from "react";
import { Buffer } from "buffer";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import nacl from "tweetnacl";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

// `bs58` ships without TypeScript types.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bs58Module = require("bs58");
const bs58 = (bs58Module.default ?? bs58Module) as {
  encode: (input: Uint8Array | Buffer) => string;
  decode: (input: string) => Uint8Array;
};

const PHANTOM_BASE_URL = "https://phantom.app/ul/v1";
const APP_URL = "https://safescan-qr.onrender.com";
const CALLBACK_PATH = "phantom-wallet";
const PHANTOM_PENDING_KEY = "phantom_wallet_pending";

nacl.setPRNG((target, length) => {
  const randomBytes = Crypto.getRandomBytes(length);
  for (let index = 0; index < length; index += 1) {
    target[index] = randomBytes[index];
  }
});

type PendingFlow = {
  keyPair: nacl.BoxKeyPair;
  sharedSecret?: Uint8Array;
  session?: string;
  walletAddress?: string;
  challengeMessage?: string;
  resolve?: () => void;
  reject?: (error: Error) => void;
};

type PersistedPendingFlow = {
  secretKey: string;
  publicKey: string;
  sharedSecret?: string;
  session?: string;
  walletAddress?: string;
  challengeMessage?: string;
};

let pendingFlow: PendingFlow | null = null;
const pendingListeners = new Set<(pending: boolean) => void>();
const processedCallbackUrls = new Set<string>();

function setPendingFlow(next: PendingFlow | null) {
  pendingFlow = next;
  pendingListeners.forEach((listener) => listener(Boolean(next)));
}

function serializePending(pending: PendingFlow): PersistedPendingFlow {
  return {
    secretKey: bs58.encode(pending.keyPair.secretKey),
    publicKey: bs58.encode(pending.keyPair.publicKey),
    sharedSecret: pending.sharedSecret ? bs58.encode(pending.sharedSecret) : undefined,
    session: pending.session,
    walletAddress: pending.walletAddress,
    challengeMessage: pending.challengeMessage
  };
}

function deserializePending(pending: PersistedPendingFlow): PendingFlow {
  return {
    keyPair: {
      publicKey: bs58.decode(pending.publicKey),
      secretKey: bs58.decode(pending.secretKey)
    },
    sharedSecret: pending.sharedSecret ? bs58.decode(pending.sharedSecret) : undefined,
    session: pending.session,
    walletAddress: pending.walletAddress,
    challengeMessage: pending.challengeMessage
  };
}

async function persistPendingFlow(pending: PendingFlow | null) {
  if (!pending) {
    await SecureStore.deleteItemAsync(PHANTOM_PENDING_KEY).catch(() => undefined);
    return;
  }
  await SecureStore.setItemAsync(PHANTOM_PENDING_KEY, JSON.stringify(serializePending(pending)));
}

async function getPendingFlow() {
  if (pendingFlow) return pendingFlow;
  const rawPending = await SecureStore.getItemAsync(PHANTOM_PENDING_KEY);
  if (!rawPending) return null;

  try {
    const restored = deserializePending(JSON.parse(rawPending) as PersistedPendingFlow);
    setPendingFlow(restored);
    return restored;
  } catch {
    await persistPendingFlow(null);
    return null;
  }
}

function finishPending(error?: Error) {
  const pending = pendingFlow;
  setPendingFlow(null);
  void persistPendingFlow(null);
  if (error) pending?.reject?.(error);
  else pending?.resolve?.();
}

function toBytes(value: string) {
  return new Uint8Array(Buffer.from(value, "utf8"));
}

function fromBytes(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("utf8");
}

function createCallbackUrl(stage: "connect" | "sign") {
  const separator = Linking.createURL(CALLBACK_PATH).includes("?") ? "&" : "?";
  return `${Linking.createURL(CALLBACK_PATH)}${separator}phantom_stage=${stage}`;
}

function createUrl(path: "connect" | "signMessage", params: Record<string, string>) {
  return `${PHANTOM_BASE_URL}/${path}?${new URLSearchParams(params).toString()}`;
}

function encryptPayload(payload: unknown, sharedSecret: Uint8Array) {
  const nonce = nacl.randomBytes(24);
  const encryptedPayload = nacl.box.after(toBytes(JSON.stringify(payload)), nonce, sharedSecret);
  return {
    nonce: bs58.encode(nonce),
    payload: bs58.encode(encryptedPayload)
  };
}

function decryptPayload(data: string, nonce: string, sharedSecret: Uint8Array) {
  const decrypted = nacl.box.open.after(bs58.decode(data), bs58.decode(nonce), sharedSecret);
  if (!decrypted) throw new Error("Phantom returned a response SafeScan could not decrypt.");
  return JSON.parse(fromBytes(decrypted)) as Record<string, string>;
}

function getUrlParams(url: string) {
  const parsed = Linking.parse(url);
  return parsed.queryParams ?? {};
}

function getStringParam(params: Record<string, unknown>, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

function phantomError(params: Record<string, unknown>) {
  const errorCode = getStringParam(params, "errorCode");
  const errorMessage = getStringParam(params, "errorMessage");
  if (!errorCode && !errorMessage) return null;
  return new Error(errorMessage ? `${errorMessage} (${errorCode ?? "Phantom error"})` : `Phantom returned ${errorCode}.`);
}

async function openPhantomSignMessage(pending: PendingFlow, session: string, walletAddress: string) {
  if (!pending.sharedSecret) throw new Error("Missing Phantom shared secret.");

  const challenge = await api.wallet.nonce(walletAddress);
  pending.challengeMessage = challenge.message;
  await persistPendingFlow(pending);
  const encrypted = encryptPayload(
    {
      session,
      message: bs58.encode(toBytes(challenge.message)),
      display: "utf8"
    },
    pending.sharedSecret
  );

  await Linking.openURL(
    createUrl("signMessage", {
      dapp_encryption_public_key: bs58.encode(pending.keyPair.publicKey),
      nonce: encrypted.nonce,
      redirect_link: createCallbackUrl("sign"),
      payload: encrypted.payload
    })
  );
}

export async function handlePhantomWalletCallback(url: string) {
  if (!url.includes(CALLBACK_PATH)) return "ignored" as const;

  if (processedCallbackUrls.has(url)) {
    const pending = await getPendingFlow();
    return pending ? ("awaiting-signature" as const) : ("connected" as const);
  }
  processedCallbackUrls.add(url);

  const pending = await getPendingFlow();
  if (!pending) throw new Error("Wallet connection expired. Start the Phantom connection again.");

  try {
    const params = getUrlParams(url);
    const returnedError = phantomError(params);
    if (returnedError) throw returnedError;

    const data = getStringParam(params, "data");
    const nonce = getStringParam(params, "nonce");
    if (!data || !nonce) throw new Error("Phantom did not return wallet data.");

    if (!pending.sharedSecret) {
      const phantomEncryptionPublicKey = getStringParam(params, "phantom_encryption_public_key");
      if (!phantomEncryptionPublicKey) throw new Error("Phantom did not return an encryption key.");
      pending.sharedSecret = nacl.box.before(bs58.decode(phantomEncryptionPublicKey), pending.keyPair.secretKey);

      const decrypted = decryptPayload(data, nonce, pending.sharedSecret);
      const session = decrypted.session;
      const walletAddress = decrypted.public_key;
      if (!session || !walletAddress) throw new Error("Phantom did not return a wallet address.");

      pending.session = session;
      pending.walletAddress = walletAddress;
      await persistPendingFlow(pending);
      await openPhantomSignMessage(pending, session, walletAddress);
      return "awaiting-signature" as const;
    }

    const decrypted = decryptPayload(data, nonce, pending.sharedSecret);
    const signature = decrypted.signature;
    const walletAddress = pending.walletAddress;
    if (!signature || !walletAddress) {
      const duplicateSession = decrypted.session;
      const duplicateWalletAddress = decrypted.public_key;
      const isDuplicateConnectResponse =
        Boolean(duplicateSession && duplicateWalletAddress) &&
        duplicateSession === pending.session &&
        duplicateWalletAddress === pending.walletAddress;

      if (isDuplicateConnectResponse && pending.session && pending.walletAddress) {
        await openPhantomSignMessage(pending, pending.session, pending.walletAddress);
        return "awaiting-signature" as const;
      }

      throw new Error("Phantom did not return a message signature.");
    }

    await api.wallet.verify(walletAddress, signature);
    useAuthStore.getState().setWalletAddress(walletAddress);
    finishPending();
    return "connected" as const;
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error("Could not connect Solana wallet.");
    finishPending(normalizedError);
    throw normalizedError;
  }
}

export function useWallet() {
  const publicKey = useAuthStore((state) => state.walletAddress);
  const setWalletAddress = useAuthStore((state) => state.setWalletAddress);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);
  const [isConnecting, setIsConnecting] = useState(Boolean(pendingFlow));

  useEffect(() => {
    pendingListeners.add(setIsConnecting);
    const subscription = Linking.addEventListener("url", (event) => {
      void handlePhantomWalletCallback(event.url).catch(() => undefined);
    });

    return () => {
      pendingListeners.delete(setIsConnecting);
      subscription.remove();
    };
  }, []);

  const connect = useCallback(async () => {
    if (!isAuthenticated || userId === "demo-user") {
      throw new Error("Sign in with Google before connecting a Solana wallet.");
    }

    if (isConnecting) return;

    setIsConnecting(true);
    return new Promise<void>((resolve, reject) => {
      const keyPair = nacl.box.keyPair();
      const pending = { keyPair, resolve, reject };
      setPendingFlow(pending);
      persistPendingFlow(pending)
        .then(() =>
          Linking.openURL(
            createUrl("connect", {
              dapp_encryption_public_key: bs58.encode(keyPair.publicKey),
              app_url: APP_URL,
              redirect_link: createCallbackUrl("connect"),
              cluster: "mainnet-beta"
            })
          )
        )
        .catch((error) => {
          finishPending(error instanceof Error ? error : new Error("Could not open Phantom."));
        });
    });
  }, [isAuthenticated, isConnecting, userId]);

  const disconnect = useCallback(async () => {
    setIsConnecting(false);
    setPendingFlow(null);
    await persistPendingFlow(null);
    setWalletAddress(null);
    await api.wallet.disconnect().catch(() => undefined);
  }, [setWalletAddress]);

  return {
    connect,
    disconnect,
    publicKey,
    isConnected: Boolean(publicKey),
    isConnecting
  };
}
