import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { RootLayout } from '@/app/layout/RootLayout'
import { renderWithStore } from '@/test/renderWithStore'

function renderLayoutWith(child: React.ReactElement) {
  return renderWithStore(null, {
    routes: [{ path: '/', element: <RootLayout />, children: [{ index: true, element: child }] }],
  })
}

describe('toast feedback', () => {
  it('shows a success toast message', async () => {
    renderLayoutWith(<button onClick={() => toast.success('Product created.')}>Notify</button>)

    await userEvent.click(await screen.findByRole('button', { name: 'Notify' }))

    expect(await screen.findByText('Product created.')).toBeInTheDocument()
  })

  it('shows an error toast message', async () => {
    renderLayoutWith(<button onClick={() => toast.error('Could not load products.')}>Notify</button>)

    await userEvent.click(await screen.findByRole('button', { name: 'Notify' }))

    expect(await screen.findByText('Could not load products.')).toBeInTheDocument()
  })
})
