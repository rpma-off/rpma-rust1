import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        // Base colors using CSS variables
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          hover: 'hsl(var(--primary-hover))',
          active: 'hsl(var(--primary-active))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          hover: 'hsl(var(--accent-hover))',
          active: 'hsl(var(--accent-active))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        rpma: {
          DEFAULT: 'hsl(var(--rpma-primary))',
          hover: 'hsl(var(--rpma-hover))',
          active: 'hsl(var(--rpma-active))',
          foreground: 'hsl(var(--rpma-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        
        // Status colors
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        error: 'hsl(var(--error))',
        info: 'hsl(var(--info))',
        
        // Chart colors
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        
        // Priority colors (direct values for badges/tags)
        priority: {
          low: '#3B82F6',      // Blue
          medium: '#F59E0B',   // Amber
          high: '#F97316',     // Deep Orange
          urgent: '#EF4444',   // Red
        },
        
        // Workflow status colors
        workflow: {
          draft: '#6B7280',      // Gray
          scheduled: '#3B82F6',  // Blue
          inProgress: '#F59E0B', // Amber
          completed: '#10B981',  // Green
          cancelled: '#EF4444',  // Red
        },
      },
      
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // v2 Design System border radius
        none: '0px',
        xs: '4px',      // Small (tags, badges)
        DEFAULT: '8px', // Medium (buttons, inputs)
        xl: '12px',     // Large (cards)
        '2xl': '16px',  // XLarge (modal dialogs)
        full: '9999px', // Full (pills, avatars)
      },
      
      spacing: {
        // Existing custom spacing
        '18': 'var(--space-18)', // 72px - v2 Design System
        '20': 'var(--space-20)', // 80px - v2 Design System
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
        // v2 Design System spacing (4px base unit)
        '1': 'var(--space-1)',   // 4px
        '2': 'var(--space-2)',   // 8px
        '3': 'var(--space-3)',   // 12px
        '4': 'var(--space-4)',   // 16px
        '5': 'var(--space-5)',   // 20px
        '6': 'var(--space-6)',   // 24px
        '8': 'var(--space-8)',   // 32px
        '10': 'var(--space-10)', // 40px
        '12': 'var(--space-12)', // 48px
        '16': 'var(--space-16)', // 64px
      },
      
      fontSize: {
        // v2 Design System typography scale
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],  // 10px - Tiny
        'xs': ['0.75rem', { lineHeight: '1rem' }],       // 12px - Caption
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px - Body Small
        'base': ['1rem', { lineHeight: '1.5rem' }],      // 16px - Body
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],   // 18px - Body Large
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],    // 20px - H4
        '2xl': ['1.5rem', { lineHeight: '2rem' }],       // 24px - H3
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],  // 30px - H2
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],    // 36px - H1
        '5xl': ['3rem', { lineHeight: '1.1' }],          // 48px - Display
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      
      fontWeight: {
        normal: '400',    // Regular
        medium: '500',    // Medium
        semibold: '600',  // Semibold
        bold: '700',      // Bold
      },
      
      boxShadow: {
        // v2 Design System elevation levels
        'sm': 'var(--shadow-sm)',   // Level 1 - Subtle
        'md': 'var(--shadow-md)',   // Level 2 - Card
        'lg': 'var(--shadow-lg)',   // Level 3 - Raised
        'xl': 'var(--shadow-xl)',   // Level 4 - Floating
        '2xl': 'var(--shadow-2xl)', // Level 5 - Modal
      },
      
      transitionDuration: {
        'fast': 'var(--transition-fast)',   // 150ms
        'base': 'var(--transition-base)',   // 200ms
        'slow': 'var(--transition-slow)',   // 300ms
      },
      
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.0, 0, 0.2, 1)',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      
      keyframes: {
        // v2 Design System animations
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideInRight: {
          from: {
            opacity: '0',
            transform: 'translateX(100%)',
          },
          to: {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      
      animation: {
        fadeIn: 'fadeIn 300ms ease-out',
        slideUp: 'slideUp 300ms ease-out',
        slideInRight: 'slideInRight 300ms ease-out',
        pulse: 'pulse 1500ms ease-in-out infinite',
        spin: 'spin 800ms linear infinite',
      },
    },
  },
  plugins: [],
}

export default config