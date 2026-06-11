/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wechat: {
          green: '#07C160',
          bg: '#EDEDED',
          bubble: {
            user: '#95EC69',
            ai: '#FFFFFF',
          },
        },
      },
    },
  },
  plugins: [],
};
