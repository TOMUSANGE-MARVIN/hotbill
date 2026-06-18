import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: '#00012A',
        purple: {
          DEFAULT: '#4F4AD7',
          light: '#6B66E3',
          dark: '#3F3ABF',
        },
        lightgray: '#EFEFEF',
      },
      fontFamily: {
        sans: ['Karla', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1200px',
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        pill: '999px',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        marquee: 'marquee 22s linear infinite',
        spinSlow: 'spinSlow 8s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
