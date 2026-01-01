# UI Primitives: Button, Input, Select

## Context
Create the foundational UI primitives using React Aria Components. These components form the building blocks for all other UI elements and must be accessible, keyboard-navigable, and consistently styled.

## Acceptance Criteria
- [x] Button component with variants (primary, secondary, ghost, destructive)
- [x] Button sizes (sm, md, lg, icon)
- [x] IconButton component for icon-only buttons
- [x] Input component with proper focus states
- [x] TextArea component for multi-line input
- [x] Select/Dropdown component with keyboard navigation
- [x] Label component for form accessibility
- [x] All components support disabled state
- [x] All components have proper focus ring styles
- [x] TypeScript props interfaces exported

## Technical Guidance

### Button Component
```tsx
// components/ui/button.tsx
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import { tv, type VariantProps } from 'tailwind-variants';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = tv({
  base: [
    'inline-flex items-center justify-center gap-2 rounded-md font-medium',
    'transition-colors duration-150',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  variants: {
    variant: {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      destructive: 'bg-error text-white hover:bg-error/90',
      outline: 'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground',
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
      icon: 'h-10 w-10',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export interface ButtonProps extends AriaButtonProps, VariantProps<typeof buttonVariants> {
  className?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, className, ...props }, ref) => (
    <AriaButton
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';
```

### Input Component
```tsx
// components/ui/input.tsx
import { TextField, Input as AriaInput, Label, type TextFieldProps } from 'react-aria-components';
import { tv, type VariantProps } from 'tailwind-variants';
import { forwardRef } from 'react';

const inputVariants = tv({
  slots: {
    root: 'flex flex-col gap-1.5',
    label: 'text-sm font-medium text-foreground',
    input: [
      'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2',
      'text-sm text-foreground placeholder:text-muted-foreground',
      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
      'disabled:cursor-not-allowed disabled:opacity-50',
    ],
  },
});

export interface InputProps extends Omit<TextFieldProps, 'children'> {
  label?: string;
  placeholder?: string;
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, placeholder, className, ...props }, ref) => {
    const styles = inputVariants();
    return (
      <TextField className={styles.root({ className })} {...props}>
        {label && <Label className={styles.label()}>{label}</Label>}
        <AriaInput ref={ref} placeholder={placeholder} className={styles.input()} />
      </TextField>
    );
  }
);
Input.displayName = 'Input';
```

### Select Component
```tsx
// components/ui/select.tsx
import {
  Select as AriaSelect,
  SelectValue,
  Button,
  Popover,
  ListBox,
  ListBoxItem,
  Label,
  type SelectProps as AriaSelectProps,
  type ListBoxItemProps,
} from 'react-aria-components';
import { ChevronDown, Check } from 'lucide-react';
import { tv } from 'tailwind-variants';

const selectVariants = tv({
  slots: {
    root: 'flex flex-col gap-1.5',
    label: 'text-sm font-medium text-foreground',
    trigger: [
      'flex h-10 w-full items-center justify-between rounded-md border border-border',
      'bg-background px-3 py-2 text-sm',
      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
    ],
    popover: [
      'w-[--trigger-width] overflow-hidden rounded-md border border-border',
      'bg-background shadow-lg',
    ],
    listbox: 'max-h-60 overflow-auto p-1',
    item: [
      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm',
      'outline-none transition-colors',
      'focus:bg-accent focus:text-accent-foreground',
      'data-[selected]:bg-primary/10',
    ],
  },
});

interface SelectProps<T extends object> extends AriaSelectProps<T> {
  label?: string;
  placeholder?: string;
  items: Iterable<T>;
  children: (item: T) => React.ReactNode;
}

export function Select<T extends object>({ label, placeholder, items, children, ...props }: SelectProps<T>) {
  const styles = selectVariants();
  
  return (
    <AriaSelect className={styles.root()} {...props}>
      {label && <Label className={styles.label()}>{label}</Label>}
      <Button className={styles.trigger()}>
        <SelectValue placeholder={placeholder} />
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>
      <Popover className={styles.popover()}>
        <ListBox className={styles.listbox()} items={items}>
          {children}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}

export function SelectItem(props: ListBoxItemProps) {
  const styles = selectVariants();
  return (
    <ListBoxItem {...props} className={styles.item()}>
      {({ isSelected }) => (
        <>
          {props.children}
          {isSelected && <Check className="absolute right-2 h-4 w-4" />}
        </>
      )}
    </ListBoxItem>
  );
}
```

### Utility Function
```tsx
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Dependencies
- 01-foundation-project-setup
- 02-foundation-react-aria-tailwind

## Estimated Effort
1.5 days

## Notes
- Reference Shadcn/ui patterns but implement with React Aria
- Ensure all components are accessible
- Add Storybook stories if time permits
- 2025-12-31: Implemented button, icon button, input, textarea, select, label, and barrel exports. Ran `bun run check`.
