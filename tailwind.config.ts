import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "nav-shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(8px, -6px) scale(1.05)" },
          "66%": { transform: "translate(-4px, 4px) scale(0.98)" },
        },
        "float-slower": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(-6px, -4px)" },
        },
      },
      animation: {
        "nav-shimmer": "nav-shimmer 8s ease-in-out infinite",
        "float-slow": "float-slow 6s ease-in-out infinite",
        "float-slower": "float-slower 10s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
