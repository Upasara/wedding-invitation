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
        background: "var(--background)",
        foreground: "var(--foreground)",
        gold: {
          50: "#FAF6EF",
          100: "#F3EAD9",
          200: "#E5D4B2",
          300: "#D6BD8A",
          400: "#C5A880",
          500: "#B89758",
          600: "#9A7B3E",
          700: "#7C612E",
          800: "#5D4820",
          900: "#3E3013",
          DEFAULT: "#C5A880",
          light: "#E5D4B2",
          dark: "#9A7B3E",
          accent: "#D4AF37",
        },
        charcoal: {
          50: "#F5F5F5",
          100: "#EAEAEA",
          200: "#D1D1D1",
          300: "#A3A3A3",
          400: "#737373",
          500: "#525252",
          600: "#3D3D3D",
          700: "#2B2B2B",
          800: "#1C1C1C",
          900: "#121212",
          950: "#0A0A0A",
          DEFAULT: "#1C1C1C",
        },
        ivory: {
          50: "#FDFAF6",
          100: "#FAF7F2",
          200: "#F5F0E8",
          DEFAULT: "#FAF7F2",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "Cambria", "serif"],
        display: ["var(--font-playfair)", "Bodoni MT", "Didot", "serif"],
        sans: ["var(--font-montserrat)", "system-ui", "-apple-system", "sans-serif"],
      },
      letterSpacing: {
        widest: "0.25em",
        ultra: "0.35em",
      },
      animation: {
        "fade-in": "fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in-up": "fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-subtle": "pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
