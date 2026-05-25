import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1F2937",
        line: "#D8DEE8",
        surface: "#F7F9FC",
        accent: "#0F766E"
      }
    }
  },
  plugins: []
};

export default config;

