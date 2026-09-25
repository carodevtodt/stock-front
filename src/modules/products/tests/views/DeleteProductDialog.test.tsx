import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { Toaster } from '@/shared/components/ui/sonner'
import { renderWithStore } from '@/test/renderWithStore'
import { server } from '@/test/server'
import { DeleteProductDialog } from '../../views/ProductListView/components/DeleteProductDialog'
import type { Product } from '../../types/product'
import { buildProduct } from '../mocks/product.factory'
import { productsUrl } from '../mocks/products.handlers'

const keyboard = () => buildProduct({ name: 'Keyboard' })

/** Answer every DELETE with 204 and record the product id it was sent for. */
function recordDeletes() {
  const ids: string[] = []
  server.use(
    http.delete(`${productsUrl}:id/`, ({ params }) => {
      ids.push(params.id as string)
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return ids
}

function renderDialog(product: Product) {
  const user = userEvent.setup()
  const onOpenChange = vi.fn()
  const onDeleted = vi.fn()
  const utils = renderWithStore(
    <>
      <DeleteProductDialog product={product} onOpenChange={onOpenChange} onDeleted={onDeleted} />
      {/* The Toaster normally lives in the app layout; mount one so toasts can be asserted here. */}
      <Toaster />
    </>,
  )
  return { user, onOpenChange, onDeleted, ...utils }
}

describe('DeleteProductDialog', () => {
  it('names the product and warns that it cannot be undone', async () => {
    const deletes = recordDeletes()
    renderDialog(keyboard())

    const dialog = await screen.findByRole('alertdialog', { name: 'Delete product?' })

    expect(within(dialog).getByText('"Keyboard" will be permanently deleted.')).toBeInTheDocument()
    expect(within(dialog).getByText('This action cannot be undone.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(deletes).toEqual([])
  })
})

describe('DeleteProductDialog confirm', () => {
  /** Keep every DELETE pending, so the in-flight state can be asserted. */
  function holdDeletes() {
    server.use(http.delete(`${productsUrl}:id/`, async () => delay('infinite')))
  }

  it('sends one DELETE for the product id when Delete is clicked', async () => {
    const deletes = recordDeletes()
    const product = keyboard()
    const { user, onOpenChange, onDeleted } = renderDialog(product)

    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Product deleted.')).toBeInTheDocument()
    expect(deletes).toEqual([product.id])
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onDeleted).toHaveBeenCalledTimes(1)
  })

  it('disables Delete and Cancel and shows a spinner while deleting', async () => {
    holdDeletes()
    const { user } = renderDialog(keyboard())

    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('button', { name: 'Deleting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('does not close on Escape while deleting', async () => {
    holdDeletes()
    const { user, onOpenChange } = renderDialog(keyboard())
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await screen.findByRole('button', { name: 'Deleting…' })

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument())
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})

describe('DeleteProductDialog errors', () => {
  it('shows "Could not delete product." and stays open with Delete enabled on 500', async () => {
    server.use(
      http.delete(`${productsUrl}:id/`, () => HttpResponse.json({ detail: 'boom' }, { status: 500 })),
    )
    const { user, onOpenChange, onDeleted } = renderDialog(keyboard())

    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Could not delete product.')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('shows "Could not delete product." and stays open when the network fails', async () => {
    server.use(http.delete(`${productsUrl}:id/`, () => HttpResponse.error()))
    const { user, onOpenChange } = renderDialog(keyboard())

    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Could not delete product.')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('deletes on a second click after a failure', async () => {
    server.use(
      http.delete(`${productsUrl}:id/`, () => HttpResponse.json({}, { status: 500 }), {
        once: true,
      }),
    )
    const deletes: string[] = []
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'DELETE') deletes.push(request.url)
    })
    const { user, onDeleted } = renderDialog(keyboard())
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await screen.findByText('Could not delete product.')

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Product deleted.')).toBeInTheDocument()
    expect(deletes).toHaveLength(2)
    expect(onDeleted).toHaveBeenCalledTimes(1)
    server.events.removeAllListeners()
  })
})
