import type { Config } from 'tailwindcss';

// I token vivono come CSS custom properties in app/globals.css — qui li
// esponiamo anche a Tailwind per le utility future, senza duplicare i valori.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: 'var(--fondo)',
        superficie: 'var(--superficie)',
        linea: 'var(--linea)',
        ciano: 'var(--ciano)',
        viola: 'var(--viola)',
      },
    },
  },
  plugins: [],
};

export default config;
