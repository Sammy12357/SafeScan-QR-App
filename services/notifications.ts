import * as Notifications from "expo-notifications";

export async function notifyTierUnlocked(tierName: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "SafeScan tier unlocked",
      body: `${tierName} is now active.`
    },
    trigger: null
  });
}
