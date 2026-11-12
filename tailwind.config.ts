import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#FAF7F2',
        warmWhite: '#FFFFFF',
        charcoal: '#1C1C1C',
        softGold: '#C5A880',
        metallicGold: '#D4AF37',
        mutedGray: '#77736D',
        editorialBorder: '#E6DFD3',
      },
      fontFamily: {
        cormorant: ['var(--font-cormorant)', 'Georgia', 'serif'],
        playfair: ['var(--font-playfair)', 'Georgia', 'serif'],
        montserrat: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        editorial: '0.22em',
        luxury: '0.16em',
      },
      boxShadow: {
        editorial: '0 10px 40px -15px rgba(28, 28, 28, 0.06)',
        card: '0 4px 20px -4px rgba(28, 28, 28, 0.05)',
      },
    },
  },
  plugins: [],
};

export default config;

