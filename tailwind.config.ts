import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--color-ink)',
        'ink-soft': 'var(--color-ink-soft)',
        forest: 'var(--color-forest)',
        moss: 'var(--color-moss)',
        lime: 'var(--color-lime)',
        cream: 'var(--color-canvas)',
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
      borderRadius: {
        card: 'var(--radius-xl)',
        control: 'var(--radius-md)',
      },
      boxShadow: {
        subtle: 'var(--shadow-sm)',
        card: 'var(--shadow-md)',
        dialog: 'var(--shadow-dialog)',
        focus: 'var(--focus-ring)',
      },
    },
  },
  plugins: [forms],
};

export default config;
