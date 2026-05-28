import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: "hsl(var(--background))",
        "surface-dim": "#d9dadb",
        "surface-bright": "#f8f9fa",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f4f5",
        "surface-container": "#edeeef",
        "surface-container-high": "#e7e8e9",
        "surface-container-highest": "#e1e3e4",
        "surface-variant": "#e1e3e4",
        ink: "hsl(var(--foreground))",
        line: "hsl(var(--border))",
        "on-surface": "#191c1d",
        "on-surface-variant": "#45474d",
        "on-background": "#191c1d",
        "inverse-surface": "#2e3132",
        "inverse-on-surface": "#f0f1f2",
        outline: "#75777d",
        "outline-variant": "#c5c6cd",
        "surface-tint": "#545e76",
        "soft-gold": "#c5a059",
        gold: "#c5a059",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          container: "#1b263b",
          fixed: "#d7e2ff",
          "fixed-dim": "#bbc6e2"
        },
        "on-primary": "#ffffff",
        "primary-container": "#1b263b",
        "on-primary-container": "#828da7",
        "inverse-primary": "#bbc6e2",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          container: "#fed488",
          fixed: "#ffdea5",
          "fixed-dim": "#e9c176"
        },
        "on-secondary": "#ffffff",
        "secondary-container": "#fed488",
        "on-secondary-container": "#785a1a",
        "secondary-container-on-secondary-container": "#785a1a",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      fontFamily: {
        sans: ["Public Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        "display-lg": ["Public Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        "display-lg-mobile": ["Public Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        "headline-lg": ["Public Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        "headline-md": ["Public Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        "body-lg": ["Public Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        "body-md": ["Public Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        "label-md": ["Public Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        caption: ["Public Sans", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "56px", fontWeight: "700", letterSpacing: "-0.02em" }],
        "display-lg-mobile": ["32px", { lineHeight: "40px", fontWeight: "700", letterSpacing: "-0.01em" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", fontWeight: "600", letterSpacing: "0.02em" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "400" }]
      },
      spacing: {
        base: "8px",
        xs: "4px",
        sm: "12px",
        md: "24px",
        lg: "40px",
        xl: "64px",
        gutter: "24px",
        margin: "32px",
        "margin-desktop": "32px",
        "margin-mobile": "16px"
      },
      borderRadius: {
        sm: "0.125rem",
        DEFAULT: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem"
      },
      boxShadow: {
        "soft-saas": "0 4px 12px rgba(27, 38, 59, 0.08)",
        modal: "0 12px 32px rgba(27, 38, 59, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
