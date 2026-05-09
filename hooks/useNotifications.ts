import * as Notifications from "expo-notifications";

export async function requestNotificationPermission() {
  return Notifications.requestPermissionsAsync();
}
