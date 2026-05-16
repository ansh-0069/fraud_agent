import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        grab: {
          50: "#e8fbf0",
          100: "#c9f5da",
          200: "#94ebb6",
          300: "#5fe092",
          400: "#33d176",
          500: "#00B14F",
          600: "#009543",
          700: "#017635",
          800: "#055d2c",
          900: "#074c25",
        },
        ink: {
          950: "#05070d",
          900: "#080b14",
          800: "#0d111d",
          700: "#131726",
          600: "#1a1f31",
          500: "#262c41",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0, 177, 79, 0.5)" },
          "50%": { boxShadow: "0 0 24px 4px rgba(0, 177, 79, 0.5)" },
        },
        "dash": { to: { strokeDashoffset: "0" } },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at center, transparent 0, rgba(0,0,0,0.6) 80%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
