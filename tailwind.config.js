import colors from 'tailwindcss/colors'
export default { darkMode: 'class', content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
    // amber tetap memakai palet bawaan (amber-100, amber-500, dst.) dengan warna dasar khusus
    colors: { ink: '#0B0B2B', brand: { DEFAULT: '#6366F1', dark: '#4338CA', soft: '#EEF2FF' }, sand: '#F6F7FB', amber: { ...colors.amber, DEFAULT: '#F2A93B' } } } } }
