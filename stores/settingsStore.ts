import { create } from "zustand";

type SettingsStore = {
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  darkMode: true;
  setHapticsEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  hapticsEnabled: true,
  notificationsEnabled: false,
  darkMode: true,
  setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled })
}));
