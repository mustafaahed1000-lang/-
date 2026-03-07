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
                background: '#0a0a0f',
                surface: '#12122a',
                primary: '#7b2fff', // Purple
                secondary: '#00d4ff', // Cyan
                accent: '#ff3cac', // Pink
                dark: '#0d0d1a',
            },
            fontFamily: {
                sans: ['Tajawal', 'system-ui', 'sans-serif'],
                display: ['Orbitron', 'sans-serif'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-cyber': 'linear-gradient(90deg, #00d4ff 0%, #7b2fff 50%, #ff3cac 100%)',
            },
            animation: {
                'spin-slow': 'spin 8s linear infinite',
                'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { filter: 'brightness(1)' },
                    '50%': { filter: 'brightness(1.3)' },
                }
            }
        },
    },
    plugins: [],
}
