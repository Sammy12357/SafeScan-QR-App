import { useEffect, useMemo, useRef, useState } from "react";
import { useNetInfo } from "@react-native-community/netinfo";

export function useNetworkStatus() {
  const netInfo = useNetInfo();
  const wasOffline = useRef(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const isOnline = useMemo(() => {
    if (netInfo.isConnected === false) return false;
    if (netInfo.isInternetReachable === false) return false;
    return true;
  }, [netInfo.isConnected, netInfo.isInternetReachable]);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setIsReconnecting(false);
      return;
    }

    if (!wasOffline.current) return;

    wasOffline.current = false;
    setIsReconnecting(true);
    const timeout = setTimeout(() => setIsReconnecting(false), 1200);
    return () => clearTimeout(timeout);
  }, [isOnline]);

  return { isOnline, isReconnecting };
}
