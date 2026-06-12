/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Varela Round', 'sans-serif'],
        body: ['Nunito Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: '#4338CA',
        'primary-glow': 'rgba(67, 56, 202, 0.2)',
        secondary: '#6366F1',
        accent: '#D97706',
        'accent-glow': 'rgba(217, 119, 6, 0.15)',
        surface: {
          deep: 'var(--bg-deep)',
          base: 'var(--bg-base)',
          elevated: 'var(--bg-elevated)',
          card: 'var(--bg-card)',
          input: 'var(--bg-input)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
      },
      borderRadius: {
        'custom': 'var(--radius-lg)',
      },
      animation: {
        'typing-dot': 'typingDot 1.4s infinite ease-in-out',
        'blink': 'blink 1s infinite',
      },
    },
  },
  plugins: [],
};
