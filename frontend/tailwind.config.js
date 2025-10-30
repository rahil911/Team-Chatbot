const withOpacityValue = (variable) => ({ opacityValue }) => {
  if (opacityValue !== undefined) {
    return `rgb(var(${variable}) / ${opacityValue})`;
  }
  return `rgb(var(${variable}) / 1)`;
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          950: withOpacityValue('--surface-950-rgb'),
          925: withOpacityValue('--surface-925-rgb'),
          900: withOpacityValue('--surface-900-rgb'),
          850: withOpacityValue('--surface-850-rgb'),
          800: withOpacityValue('--surface-800-rgb'),
          750: withOpacityValue('--surface-750-rgb'),
          700: withOpacityValue('--surface-700-rgb'),
        },
        text: {
          primary: withOpacityValue('--text-primary-rgb'),
          secondary: withOpacityValue('--text-secondary-rgb'),
          tertiary: withOpacityValue('--text-tertiary-rgb'),
          muted: withOpacityValue('--text-muted-rgb'),
        },
        accent: {
          blue: withOpacityValue('--accent-blue-rgb'),
          purple: withOpacityValue('--accent-purple-rgb'),
          green: withOpacityValue('--accent-green-rgb'),
          orange: withOpacityValue('--accent-orange-rgb'),
        },
        agent: {
          mathew: withOpacityValue('--agent-mathew-rgb'),
          rahil: withOpacityValue('--agent-rahil-rgb'),
          shreyas: withOpacityValue('--agent-shreyas-rgb'),
          siddarth: withOpacityValue('--agent-siddarth-rgb'),
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.04) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'panel': 'var(--shadow-soft)',
        'glow-blue': 'var(--shadow-glow-blue)',
        'glow-purple': 'var(--shadow-glow-purple)',
        'inner-glow': 'inset 0 0 20px rgba(255, 255, 255, 0.08)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
