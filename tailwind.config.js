/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#10B981',        // emerald-500
          fg: '#052e1c',            // dark fg for primary surfaces
        },
      },
      boxShadow: {
        soft: '0 8px 24px rgba(0,0,0,.25)',
      },
      borderRadius: {
        xl2: '1rem',
      },
    },
  },
  plugins: [],
};
