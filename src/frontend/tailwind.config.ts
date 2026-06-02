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
        "surface-dim": "#dfe6dc",
        "surface-bright": "#fbfcf8",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f5f7f1",
        "surface-container": "#eef3ea",
        "surface-container-high": "#e7eee2",
        "surface-container-highest": "#dfe8da",
        "surface-variant": "#e3eadf",
        ink: "hsl(var(--foreground))",
        line: "hsl(var(--border))",
        "on-surface": "#1f2933",
        "on-surface-variant": "#586474",
        "on-background": "#1f2933",
        "inverse-surface": "#06281c",
        "inverse-on-surface": "#f7fbf4",
        outline: "#7a8578",
        "outline-variant": "#d6dfd1",
        "surface-tint": "#0f8f57",
        "soft-gold": "#f4c542",
        gold: "#f4c542",
        "brand-green": "#06281c",
        "brand-mint": "#20c77a",
        "brand-lime": "#c8ef68",
        "sidebar-active": "#eaf8f0",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          container: "#0b3b2a",
          fixed: "#dff7e9",
          "fixed-dim": "#bff0d3"
        },
        "on-primary": "#ffffff",
        "primary-container": "#0b3b2a",
        "on-primary-container": "#c8ef68",
        "inverse-primary": "#88e2ad",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          container: "#e5f8ed",
          fixed: "#dff7e9",
          "fixed-dim": "#bceccc"
        },
        "on-secondary": "#06281c",
        "secondary-container": "#e5f8ed",
        "on-secondary-container": "#0f6843",
        "secondary-container-on-secondary-container": "#0f6843",
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
        "display-lg": ["48px", { lineHeight: "56px", fontWeight: "700", letterSpacing: "0" }],
        "display-lg-mobile": ["32px", { lineHeight: "40px", fontWeight: "700", letterSpacing: "0" }],
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
        sm: "0.25rem",
        DEFAULT: "0.375rem",
        md: "0.5rem",
        lg: "0.625rem",
        xl: "0.875rem"
      },
      boxShadow: {
        "soft-saas": "0 1px 2px rgba(15, 35, 26, 0.05), 0 10px 24px rgba(15, 35, 26, 0.06)",
        modal: "0 18px 48px rgba(15, 35, 26, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
