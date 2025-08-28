import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Vision.bi inspired palette
        'app-navy': '#0B1221',
        'app-surface': '#0E1424',
        'app-surface-dark': '#111827',
        'app-blue': '#00A3E0',
        'app-cyan': '#24D1E7',
        'app-slate': '#94A3B8',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', '0.75rem'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200px 0" },
          "100%": { backgroundPosition: "calc(200px + 100%) 0" },
        },
        // Vision.bi inspired animations
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%": { transform: "translateY(-2px) rotate(1deg)" },
          "66%": { transform: "translateY(1px) rotate(-1deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 5px rgba(0, 163, 224, 0.3)",
            transform: "scale(1)" 
          },
          "50%": { 
            boxShadow: "0 0 20px rgba(0, 163, 224, 0.6), 0 0 30px rgba(36, 209, 231, 0.3)",
            transform: "scale(1.02)" 
          },
        },
        "magnetic": {
          "0%": { transform: "translate(0, 0)" },
          "100%": { transform: "translate(var(--mouse-x, 0), var(--mouse-y, 0))" },
        },
        "sheen": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "particle-float": {
          "0%, 100%": { 
            transform: "translateY(0px) translateX(0px) scale(1)",
            opacity: "0.4" 
          },
          "33%": { 
            transform: "translateY(-10px) translateX(5px) scale(1.1)",
            opacity: "0.7" 
          },
          "66%": { 
            transform: "translateY(5px) translateX(-3px) scale(0.9)",
            opacity: "0.5" 
          },
        },
        "border-flow": {
          "0%, 100%": { 
            backgroundPosition: "0% 50%",
            opacity: "0.5" 
          },
          "50%": { 
            backgroundPosition: "100% 50%",
            opacity: "1" 
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "slide-up": "slide-up 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "scale-in": "scale-in 120ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "bounce-subtle": "bounce-subtle 160ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "shimmer": "shimmer 1.5s infinite linear",
        // Vision.bi inspired animations
        "gradient-shift": "gradient-shift 4s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "magnetic": "magnetic 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
        "sheen": "sheen 1.5s ease-out",
        "particle-float": "particle-float 8s ease-in-out infinite",
        "border-flow": "border-flow 3s ease-in-out infinite",
        "float-slow": "float 8s ease-in-out infinite",
        "float-delayed": "float 8s ease-in-out infinite 2s",
      },
      transitionTimingFunction: {
        'gentle': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addUtilities }: any) {
      addUtilities({
        '.animate-gentle': {
          'transition-timing-function': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        },
        '.animate-bounce-micro': {
          'animation': 'bounce-subtle 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        },
        '.glass': {
          'backdrop-filter': 'blur(16px)',
          'background': 'rgba(255, 255, 255, 0.05)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.glass-dark': {
          'backdrop-filter': 'blur(16px)',
          'background': 'rgba(0, 0, 0, 0.05)',
          'border': '1px solid rgba(255, 255, 255, 0.05)',
        },
        '.glass-surface': {
          'backdrop-filter': 'blur(20px)',
          'background': 'rgba(255, 255, 255, 0.8)',
          'border': '1px solid rgba(0, 163, 224, 0.2)',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.1)',
        },
        '.gradient-border': {
          'background': 'linear-gradient(135deg, rgba(0, 163, 224, 0.3), rgba(36, 209, 231, 0.3))',
          'border-radius': '12px',
          'padding': '1px',
        },
        '.gradient-border-content': {
          'background': 'hsl(var(--background))',
          'border-radius': '11px',
          'width': '100%',
          'height': '100%',
        },
        '.bg-gradient-radial': {
          'background': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
        },
        '.bg-gradient-conic': {
          'background': 'conic-gradient(var(--tw-gradient-stops))',
        },
        '.text-gradient': {
          'background': 'linear-gradient(135deg, #00A3E0, #24D1E7)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.noise-overlay': {
          'position': 'relative',
        },
        '.noise-overlay::before': {
          'content': '""',
          'position': 'absolute',
          'top': '0',
          'left': '0',
          'right': '0',
          'bottom': '0',
          'background-image': 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.03\'/%3E%3C/svg%3E")',
          'pointer-events': 'none',
          'z-index': '1',
        },
        '.grid-pattern': {
          'background-image': 'linear-gradient(rgba(0, 163, 224, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 163, 224, 0.1) 1px, transparent 1px)',
          'background-size': '20px 20px',
        },
        '.magnetic-button': {
          'transition': 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
          'will-change': 'transform',
        },
        '.sheen-effect': {
          'position': 'relative',
          'overflow': 'hidden',
        },
        '.sheen-effect::before': {
          'content': '""',
          'position': 'absolute',
          'top': '0',
          'left': '-100%',
          'width': '100%',
          'height': '100%',
          'background': 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
          'transition': 'left 0.6s ease-out',
        },
        '.sheen-effect:hover::before': {
          'left': '100%',
        },
      })
    }
  ],
} satisfies Config

export default config
