/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0b10',
        paper: '#f7f4ef',
        ember: '#f97316',
        ocean: '#0ea5e9',
        moss: '#22c55e',
        haze: '#e7e2d8',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 24px -12px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
}
