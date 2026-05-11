/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Pretendard', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '14px 14px 32px rgba(148, 163, 184, 0.30), -14px -14px 32px rgba(255, 255, 255, 0.95)',
        'soft-sm': '8px 8px 18px rgba(148, 163, 184, 0.24), -8px -8px 18px rgba(255, 255, 255, 0.95)',
        insetSoft: 'inset 5px 5px 12px rgba(148, 163, 184, 0.22), inset -5px -5px 12px rgba(255, 255, 255, 0.90)'
      }
    }
  },
  plugins: []
}
