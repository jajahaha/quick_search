/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#37352F',
        secondary: '#787774',
        accent: '#0066CC',
        success: '#0F7B6C',
        warning: '#D9730D',
        error: '#E03E3E',
        background: '#FFFFFF',
        'bg-secondary': '#F7F7F5',
        border: '#E5E5E5',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}