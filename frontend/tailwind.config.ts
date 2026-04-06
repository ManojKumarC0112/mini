import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#FDFDFD",
        "surface-bright": "#FFFFFF",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#F8FAFC",
        "surface-container": "#FFFFFF",
        "surface-container-high": "#F1F5F9",
        "surface-container-highest": "#E2E8F0",
        "surface-variant": "#FFFFFF",
        "on-surface": "#1E293B",
        "on-surface-variant": "#64748B",
        "outline-variant": "#CBD5E1",
        primary: "#7C3AED",
        "primary-dim": "#6D28D9",
        "on-primary": "#FFFFFF",
        "on-primary-container": "#F5F3FF",
        "secondary-container": "#EDE9FE",
        "on-secondary-container": "#4C1D95",
        "tertiary-container": "#10B981",
        tertiary: "#059669",
        "on-tertiary": "#FFFFFF",
        error: "#EF4444",
      },
      fontFamily: {
        manrope: ["var(--font-manrope)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
