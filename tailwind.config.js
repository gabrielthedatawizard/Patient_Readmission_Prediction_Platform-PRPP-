/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: {
            50: "#E6F7F7",
            100: "#B3E8E8",
            200: "#80D9D9",
            300: "#4DCACA",
            400: "#26BBBB",
            500: "#00A6A6",
            600: "#008F8F",
            700: "#007878",
            800: "#006161",
            900: "#004A4A",
          },
        },
        primary: {
          DEFAULT: '#00A6A6',
          dark: '#007878',
          light: '#33B8B8',
        },
        risk: {
          low: '#10B981',
          medium: '#F59E0B',
          high: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        trip: "0 1px 3px rgba(0,0,0,0.05), 0 10px 30px rgba(0,0,0,0.08), 0 20px 60px rgba(0,0,0,0.03)",
      },
    },
  },
  plugins: [],
}
