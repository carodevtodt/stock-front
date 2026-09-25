import { act, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { Toaster } from '@/shared/components/ui/sonner'

/** The toaster list Sonner renders once a toast is shown. */
function toasterList() {
  return document.querySelector<HTMLElement>('[data-sonner-toaster]')
}

describe('Toaster', () => {
  it('shows toasts in the top-right corner', async () => {
    render(<Toaster />)

    act(() => {
      toast.success('Product updated.')
    })

    await screen.findByText('Product updated.')
    expect(toasterList()).toHaveAttribute('data-y-position', 'top')
    expect(toasterList()).toHaveAttribute('data-x-position', 'right')
  })

  it('keeps the design-system success background instead of Sonner\'s own --success-bg', async () => {
    // Sonner sets --success-bg to a full hsl() color on the toaster, which breaks our
    // `hsl(var(--success-bg))` token and leaves success toasts transparent.
    render(<Toaster />)

    act(() => {
      toast.success('Product updated.')
    })

    await screen.findByText('Product updated.')
    expect(toasterList()!.style.getPropertyValue('--success-bg')).toBe('inherit')
  })
})
