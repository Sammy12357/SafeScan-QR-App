import { Text } from "react-native";
import { truncateMiddle } from "@/utils/url";
import { theme } from "@/constants/theme";

export function WalletAddressDisplay({ address }: { address: string }) {
  return <Text style={{ color: theme.colors.textSecondary, fontFamily: "SpaceMono" }}>{truncateMiddle(address, 34)}</Text>;
}
