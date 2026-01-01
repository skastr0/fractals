# React Aria + Tailwind Configuration

## Context
Replace Material UI with React Aria Components for accessible, unstyled primitives. React Aria provides ARIA-compliant components that we can style with Tailwind CSS. This gives us full control over the visual design while maintaining accessibility.

This work enables the entire UI component library by establishing the styling foundation.

## Acceptance Criteria
- [ ] React Aria Components installed and configured
- [ ] Tailwind CSS configured with custom design tokens
- [ ] Color scheme defined (dark theme primary, matching OpenCode aesthetics)
- [ ] Typography scale defined using Tailwind
- [ ] Spacing and sizing tokens configured
- [ ] CSS custom properties for theme variables
- [ ] Sample component renders correctly with styles
- [ ] Focus ring styles consistent across components
- [ ] Animation utilities configured (for transitions)

## Technical Guidance

### React Aria Setup
```tsx
// components/ui/button.tsx
import { Button as AriaButton, type ButtonProps } from 'react-aria-components';
import { tv, type VariantProps } from 'tailwind-variants';

const buttonStyles = tv({
  base: 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  variants: {
    variant: {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4',
      lg: 'h-12 px-6 text-lg',
      icon: 'h-10 w-10',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export interface ButtonComponentProps extends ButtonProps, VariantProps<typeof buttonStyles> {}

export function Button({ variant, size, className, ...props }: ButtonComponentProps) {
  return <AriaButton className={buttonStyles({ variant, size, className })} {...props} />;
}
```

### Tailwind Config
```js
// tailwind.config.js
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic colors
        background: {
          DEFAULT: 'hsl(var(--background))',
          stronger: 'hsl(var(--background-stronger))',
          base: 'hsl(var(--background-base))',
        },
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
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
          foreground: 'hsl(var(--accent-foreground))',
        },
        border: {
          DEFAULT: 'hsl(var(--border))',
          weak: 'hsl(var(--border-weak))',
        },
        // Status colors
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        error: 'hsl(var(--error))',
        info: 'hsl(var(--info))',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-up': 'slideUp 150ms ease-out',
        'pulse-subtle': 'pulseSubtle 2s infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
};
```

### CSS Variables (globals.css)
```css
:root {
  /* Dark theme (default) */
  --background: 222 47% 6%;
  --background-stronger: 222 47% 8%;
  --background-base: 222 47% 11%;
  --foreground: 210 40% 98%;
  
  --primary: 217 91% 60%;
  --primary-foreground: 222 47% 6%;
  
  --secondary: 217 33% 17%;
  --secondary-foreground: 210 40% 98%;
  
  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;
  
  --accent: 217 33% 17%;
  --accent-foreground: 210 40% 98%;
  
  --border: 217 33% 17%;
  --border-weak: 217 33% 12%;
  
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --error: 0 84% 60%;
  --info: 217 91% 60%;
  
  --radius: 0.5rem;
}
```

### Recommended Libraries
- `tailwind-variants` - for component variants (like cva)
- `tailwindcss-animate` - for animations
- `clsx` + `tailwind-merge` - for className utilities

### Reference OpenCode's Design
Study `/packages/app/` and `/packages/console/` in opencode-fork for their color palette and component patterns. Match the visual aesthetic while using React Aria.

## Dependencies
- 01-foundation-project-setup

## Estimated Effort
1 day

## Notes
- Consider extracting a shared `cn()` utility for className merging
- Document color token usage for consistency
- Test with screen reader to verify accessibility
