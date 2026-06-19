/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ===== デザイントークン（ライトテーマ）=====
        page: '#F7F8FA',
        card: '#FFFFFF',
        ink: {
          DEFAULT: '#1A1D23', // ソフトブラック（真黒は避ける）
          soft: '#42474F',
          muted: '#6B7280',
          faint: '#9CA3AF',
        },
        line: {
          DEFAULT: '#E6E8EC',
          soft: '#EEF0F3',
        },
        accent: {
          DEFAULT: '#2F6BFF',
          soft: '#EAF0FF',
          deep: '#1E4FD6',
        },
        success: { DEFAULT: '#1FA971', soft: '#E6F6EF' },
        danger: { DEFAULT: '#E5484D', soft: '#FDECEC' },
        warn: { DEFAULT: '#D97706', soft: '#FEF3E2' },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'Hiragino Kaku Gothic ProN', 'Meiryo', 'sans-serif'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '22px',
      },
      boxShadow: {
        // 白背景で効く繊細な多層シャドウ
        card: '0 1px 2px rgba(16,24,40,.06), 0 8px 24px rgba(16,24,40,.06)',
        'card-hover': '0 2px 4px rgba(16,24,40,.07), 0 16px 40px rgba(16,24,40,.10)',
        soft: '0 1px 2px rgba(16,24,40,.05)',
        kpi: '0 1px 2px rgba(16,24,40,.05), 0 12px 32px rgba(47,107,255,.10)',
      },
      letterSpacing: {
        tightish: '-0.011em',
      },
      backgroundImage: {
        'kpi-gradient': 'linear-gradient(135deg, #FFFFFF 0%, #F4F6F9 100%)',
        'accent-gradient': 'linear-gradient(135deg, #2F6BFF 0%, #5B86FF 100%)',
        'header-gradient': 'linear-gradient(135deg, #FFFFFF 0%, #EEF3FF 100%)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
