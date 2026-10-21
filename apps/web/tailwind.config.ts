import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: "var(--tg-theme-bg-color)",
          text: "var(--tg-theme-text-color)",
          hint: "var(--tg-theme-hint-color)",
          link: "var(--tg-theme-link-color)",
          primary: "var(--tg-theme-button-color)",
          "primary-text": "var(--tg-theme-button-text-color)",
          secondary: "var(--tg-theme-secondary-bg-color)",
        },
        wallet: {
          bg: "#000000",
          card: "#16171b",
          "card-hover": "#1c1d22",
          "card-inner": "#202127",
          subcard: "#24252c",
          border: "rgba(255, 255, 255, 0.07)",
          blue: "#007aff",
          "blue-hover": "#1a8aff",
          green: "#30d158",
          rose: "#ff453a",
          orange: "#ff9500",
          purple: "#af52de",
          muted: "#8e8e93",
          "muted-light": "#a1a1a6",
          chevron: "#54575c",
        },
      },
      borderRadius: {
        "3xl": "24px",
        "4xl": "28px",
        "5xl": "32px",
      },
    },
  },
  plugins: [],
};
export default config;
