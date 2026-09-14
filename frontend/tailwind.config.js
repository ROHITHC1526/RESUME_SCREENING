/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
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
      },
      animation: {
        'shimmer': 'shimmer 2.5s infinite linear',
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
        'float-slow': 'floatSlow 3s ease-in-out infinite',
        'walk': 'walk 0.8s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(201, 122, 61, 0.4), 0 0 30px rgba(201, 122, 61, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(201, 122, 61, 0.8), 0 0 50px rgba(201, 122, 61, 0.4)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        walk: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(-10deg) translateY(-2px)' },
        }
      }
    },
  },
  plugins: [],
}
