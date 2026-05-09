import * as Linking from "expo-linking";
import { Camera } from "expo-camera";

export async function getCameraPermissionState() {
  return Camera.getCameraPermissionsAsync();
}

export async function requestCameraPermission() {
  return Camera.requestCameraPermissionsAsync();
}

export function openAppSettings() {
  return Linking.openSettings();
}
