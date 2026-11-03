import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: token("page"),
        card: token("card"),
        "card-raised": token("card-raised"),
        ink: token("ink"),
        hint: token("hint"),
        accent: token("accent"),
        good: token("good"),
        warn: token("warn"),
        bad: token("bad"),
        purple: token("purple"),
      },
    },
  },
  plugins: [],
};
export default config;
