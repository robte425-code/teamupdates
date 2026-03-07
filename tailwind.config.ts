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
        "gradient-sweep": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(20px, -12px) scale(1.08)" },
          "66%": { transform: "translate(-10px, 10px) scale(0.95)" },
        },
        "float-slower": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(-15px, -10px)" },
        },
        "bird-fly": {
          "0%": { transform: "translateX(-20%) translateY(0)" },
          "25%": { transform: "translateX(25%) translateY(-2px)" },
          "50%": { transform: "translateX(50%) translateY(0)" },
          "75%": { transform: "translateX(75%) translateY(-2px)" },
          "100%": { transform: "translateX(120%) translateY(0)" },
        },
      },
      animation: {
        "nav-shimmer": "nav-shimmer 4s ease-in-out infinite",
        "gradient-sweep": "gradient-sweep 6s ease-in-out infinite",
        "float-slow": "float-slow 4s ease-in-out infinite",
        "float-slower": "float-slower 5s ease-in-out infinite",
        "bird-fly": "bird-fly 12s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
