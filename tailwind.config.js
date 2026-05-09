/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#09111f",
        background: "#09111f",
        surface: "rgba(13, 24, 43, 0.88)",
        surfaceElevated: "rgba(10, 18, 33, 0.95)",
        border: "rgba(255, 255, 255, 0.09)",
        primary: "#67f2c8",
        primaryStrong: "#1fd6a3",
        primaryDim: "rgba(103, 242, 200, 0.15)",
        primaryGlow: "rgba(103, 242, 200, 0.30)",
        accent: "#67f2c8",
        blue: "#5a8cff",
        violet: "#8d6bff",
        safe: "#50e3a4",
        warn: "#ffbb55",
        suspicious: "#ffbb55",
        danger: "#ff6e7f",
        textPrimary: "#edf4ff",
        textSecondary: "#98a9c2",
        muted: "#98a9c2",
        risk: {
          safe: {
            bg: "rgba(80, 227, 164, 0.16)",
            text: "#50e3a4",
            border: "rgba(80, 227, 164, 0.38)",
            glow: "rgba(80, 227, 164, 0.38)"
          },
          warn: {
            bg: "rgba(255, 187, 85, 0.16)",
            text: "#ffbb55",
            border: "rgba(255, 187, 85, 0.38)",
            glow: "rgba(255, 187, 85, 0.32)"
          },
          danger: {
            bg: "rgba(255, 110, 127, 0.16)",
            text: "#ff6e7f",
            border: "rgba(255, 110, 127, 0.42)",
            glow: "rgba(255, 110, 127, 0.36)"
          },
          card: {
            bg: "rgba(8, 16, 29, 0.98)",
            border: "rgba(255, 255, 255, 0.12)",
            overlay: "rgba(3, 8, 15, 0.82)"
          }
        },
        scanner: {
          frame: "rgba(103, 242, 200, 0.20)",
          frameActive: "rgba(103, 242, 200, 0.80)",
          frameGlow: "rgba(103, 242, 200, 0.18)",
          grid: "rgba(237, 244, 255, 0.95)",
          gridAccent: "rgba(103, 242, 200, 0.95)",
          vignette: "rgba(10, 10, 15, 0.75)"
        },
        tab: {
          bg: "rgba(13, 24, 43, 0.88)",
          active: "#67f2c8",
          inactive: "#98a9c2",
          border: "rgba(255, 255, 255, 0.09)"
        }
      },
      borderRadius: {
        card: "12px",
        web: "8px",
        pill: "999px"
      },
      fontFamily: {
        ui: ["SpaceGrotesk-Regular", "sans-serif"],
        medium: ["SpaceGrotesk-Medium", "sans-serif"],
        semibold: ["SpaceGrotesk-SemiBold", "sans-serif"],
        display: ["Orbitron-Bold", "sans-serif"],
        displayBlack: ["Orbitron-Black", "sans-serif"],
        mono: ["SpaceMono-Regular", "monospace"]
      },
      fontSize: {
        xs: "11px",
        sm: "12px",
        base: "14px",
        button: "15px",
        hero: "17px",
        h3: "18px",
        h2: "22px",
        h1: "28px"
      }
    }
  },
  plugins: []
};
