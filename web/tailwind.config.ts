import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "surface-app": "var(--surface-app)",
        "surface-card": "var(--surface-card)",
        "surface-card-raised": "var(--surface-card-raised)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "market-up": "var(--market-up-500)",
        "market-down": "var(--market-down-500)",
        alert: "var(--alert-500)",
        info: "var(--info-500)",
        "border-subtle": "var(--border-subtle)",
        "border-default": "var(--border-default)",
        "action-primary": "var(--action-primary)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        m: "var(--radius-m)",
        l: "var(--radius-l)",
      },
    },
  },
  plugins: [],
};

export default config;
