import { useEffect, useRef, useState } from "react";
import { api } from "@/services/api";

const START_DELAY_MS = 5000;
const POLL_INTERVAL_MS = 3000;
const DUMMY_URL = "https://safescan-qr.onrender.com";

async function pingBackend() {
  if (await api.system.health()) return true;
  await api.system.wakeAnalyze(DUMMY_URL);
  return true;
}

export function useServerWake() {
  const mountedAt = useRef(Date.now());
  const [isWaking, setIsWaking] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isWaking) return undefined;

    const elapsedId = setInterval(() => {
      setElapsed(Math.floor((Date.now() - mountedAt.current) / 1000));
    }, 1000);

    return () => clearInterval(elapsedId);
  }, [isWaking]);

  useEffect(() => {
    let isMounted = true;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const checkServer = async () => {
      try {
        if (isMounted && (await pingBackend())) {
          setIsWaking(false);
          if (pollId) clearInterval(pollId);
        }
      } catch {
        if (isMounted) setIsWaking(true);
      }
    };

    const startId = setTimeout(() => {
      void checkServer();
      pollId = setInterval(() => void checkServer(), POLL_INTERVAL_MS);
    }, START_DELAY_MS);

    return () => {
      isMounted = false;
      clearTimeout(startId);
      if (pollId) clearInterval(pollId);
    };
  }, []);

  return { isWaking, elapsed };
}
