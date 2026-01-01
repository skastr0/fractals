# UI Components: Dialog and Menu

## Context
Create Dialog and Menu components for modals, dropdowns, and context menus. These are critical for user interactions like project selection, settings, and contextual actions.

## Acceptance Criteria
- [x] Dialog component with modal overlay
- [x] Dialog with header, content, footer sections
- [x] Dialog close on escape and backdrop click
- [x] Menu component for dropdown menus
- [x] MenuTrigger for activating menus
- [x] MenuItem with keyboard navigation
- [x] MenuSeparator for grouping items
- [x] ContextMenu for right-click menus
- [x] Proper focus trapping in dialogs
- [x] Animation for open/close transitions

## Technical Guidance

### Dialog Component
```tsx
// components/ui/dialog.tsx
import {
  Dialog as AriaDialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Heading,
  type DialogProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { X } from 'lucide-react';
import { Button } from './button';

const dialogVariants = tv({
  slots: {
    overlay: [
      'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
      'data-[entering]:animate-in data-[entering]:fade-in-0',
      'data-[exiting]:animate-out data-[exiting]:fade-out-0',
    ],
    modal: [
      'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
      'rounded-lg border border-border bg-background p-6 shadow-xl',
      'data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95',
      'data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95',
    ],
    header: 'flex items-center justify-between mb-4',
    title: 'text-lg font-semibold text-foreground',
    content: 'text-sm text-muted-foreground',
    footer: 'mt-6 flex justify-end gap-3',
    closeButton: 'absolute right-4 top-4',
  },
});

interface DialogContentProps extends DialogProps {
  title?: string;
  children: React.ReactNode;
}

export function Dialog({ children }: { children: React.ReactNode }) {
  return <DialogTrigger>{children}</DialogTrigger>;
}

export function DialogContent({ title, children, ...props }: DialogContentProps) {
  const styles = dialogVariants();
  
  return (
    <ModalOverlay className={styles.overlay()}>
      <Modal className={styles.modal()}>
        <AriaDialog {...props}>
          {({ close }) => (
            <>
              {title && (
                <div className={styles.header()}>
                  <Heading slot="title" className={styles.title()}>
                    {title}
                  </Heading>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={styles.closeButton()}
                    onPress={close}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className={styles.content()}>{children}</div>
            </>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

export const DialogTrigger = DialogTrigger;
export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const styles = dialogVariants();
  return <div className={styles.header({ className })} {...props} />;
};
export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const styles = dialogVariants();
  return <div className={styles.footer({ className })} {...props} />;
};
```

### Menu Component
```tsx
// components/ui/menu.tsx
import {
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuTrigger,
  Popover,
  Separator,
  type MenuProps,
  type MenuItemProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

const menuVariants = tv({
  slots: {
    popover: [
      'min-w-[8rem] overflow-hidden rounded-md border border-border',
      'bg-background p-1 shadow-lg',
      'data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95',
      'data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95',
    ],
    menu: 'outline-none',
    item: [
      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm',
      'outline-none transition-colors',
      'focus:bg-accent focus:text-accent-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    ],
    separator: '-mx-1 my-1 h-px bg-border',
    shortcut: 'ml-auto text-xs tracking-widest text-muted-foreground',
    icon: 'mr-2 h-4 w-4',
  },
});

export function Menu<T extends object>({ children, ...props }: MenuProps<T>) {
  const styles = menuVariants();
  return (
    <Popover className={styles.popover()}>
      <AriaMenu className={styles.menu()} {...props}>
        {children}
      </AriaMenu>
    </Popover>
  );
}

interface CustomMenuItemProps extends MenuItemProps {
  shortcut?: string;
  icon?: React.ReactNode;
}

export function MenuItem({ shortcut, icon, children, ...props }: CustomMenuItemProps) {
  const styles = menuVariants();
  return (
    <AriaMenuItem className={styles.item()} {...props}>
      {icon && <span className={styles.icon()}>{icon}</span>}
      {children}
      {shortcut && <span className={styles.shortcut()}>{shortcut}</span>}
    </AriaMenuItem>
  );
}

export function MenuSeparator() {
  const styles = menuVariants();
  return <Separator className={styles.separator()} />;
}

export { MenuTrigger };
```

### Context Menu
```tsx
// components/ui/context-menu.tsx
import { Menu, MenuItem, MenuSeparator } from './menu';
import { useContextMenu } from '@/hooks/useContextMenu';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  onAction?: () => void;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
}

export function ContextMenu({ items, children }: ContextMenuProps) {
  const { isOpen, position, open, close } = useContextMenu();

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        open({ x: e.clientX, y: e.clientY });
      }}
    >
      {children}
      {isOpen && (
        <div
          style={{ position: 'fixed', left: position.x, top: position.y }}
          className="z-50"
        >
          <Menu onClose={close}>
            {items.map((item) => (
              <MenuItem
                key={item.id}
                icon={item.icon}
                shortcut={item.shortcut}
                isDisabled={item.disabled}
                onAction={() => {
                  item.onAction?.();
                  close();
                }}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </div>
      )}
    </div>
  );
}
```

## Dependencies
- 02-foundation-react-aria-tailwind
- 05-ui-primitive-components

## Estimated Effort
1 day

## Notes
- Dialogs must trap focus for accessibility
- Menus should close on Escape and click outside
- Consider using Framer Motion for smoother animations
- 2026-01-01: Added dialog, menu, and context menu components with animations and focus trapping. Files changed: components/ui/dialog.tsx, components/ui/menu.tsx, components/ui/context-menu.tsx, hooks/useContextMenu.ts, components/ui/index.ts.
