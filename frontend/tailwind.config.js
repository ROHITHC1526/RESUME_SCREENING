/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0B1220',
          800: '#141E33',
          700: '#1E2D4A',
          600: '#2C3E61',
        },
        paper: {
          50: '#FAF7F0',
          100: '#F5F0E6',
          200: '#EBE2D3',
          300: '#DDD0BC',
        },
        amber: {
          brand: '#C97A3D',
          hover: '#B3672D',
          light: '#F5E6D8'
        },
        emerald: {
          brand: '#1E7A5F',
          light: '#E6F4EF'
        }
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
