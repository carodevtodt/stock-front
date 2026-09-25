import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

// Sonner defines its own `--success-bg` (a full hsl() color) on the toaster, which clashes with
// our design token of the same name and turns `hsl(var(--success-bg))` invalid (a transparent
// toast). Inheriting keeps the token from :root inside the toaster.
const TOKEN_OVERRIDES = { '--success-bg': 'inherit' } as React.CSSProperties

// Feedback colors per docs/design-system.md: green = success, red = error.
// The app has no dark-mode switch yet, so the toaster follows the light theme.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-right"
      className="toaster group"
      style={TOKEN_OVERRIDES}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          success: '!bg-success-bg !text-success !border-success',
          error: '!bg-destructive-bg !text-destructive !border-destructive',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
