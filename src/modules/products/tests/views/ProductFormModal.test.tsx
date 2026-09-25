import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithStore } from '@/test/renderWithStore'
import { server } from '@/test/server'
import { ProductFormModal } from '../../views/ProductListView/components/ProductFormModal'
import type { ProductFormValues } from '../../types/product'
import { buildProduct } from '../mocks/product.factory'
import { productsUrl } from '../mocks/products.handlers'

const validValues: ProductFormValues = {
  name: 'Keyboard',
  description: 'Mechanical keyboard',
  price: '49.99',
  stock: '10',
}

function recordRequests() {
  const bodies: unknown[] = []
  server.use(
    http.post(productsUrl, async ({ request }) => {
      bodies.push(await request.json())
      return HttpResponse.json(buildProduct(), { status: 201 })
    }),
  )
  return bodies
}

function renderModal() {
  const user = userEvent.setup()
  const onOpenChange = vi.fn()
  const utils = renderWithStore(<ProductFormModal open onOpenChange={onOpenChange} />)
  return { user, onOpenChange, ...utils }
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<ProductFormValues> = {},
) {
  const values = { ...validValues, ...overrides }
  const fields: [RegExp, string][] = [
    [/^name/i, values.name],
    [/^description/i, values.description],
    [/^price/i, values.price],
    [/^stock/i, values.stock],
  ]
  for (const [label, value] of fields) {
    const input = await screen.findByLabelText(label)
    await user.clear(input)
    if (value) await user.type(input, value)
  }
}

describe('ProductFormModal validation', () => {
  it('shows required messages and sends nothing when saving an empty form', async () => {
    const requests = recordRequests()
    const { user } = renderModal()

    await user.click(await screen.findByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Price is required.')).toBeInTheDocument()
    expect(screen.getByText('Stock is required.')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })

  it.each([
    ['price is 0', { price: '0' }, /^price/i, 'Price must be greater than 0.'],
    ['price has 3 decimals', { price: '9.999' }, /^price/i, 'Price must have at most 2 decimals.'],
    ['stock is negative', { stock: '-1' }, /^stock/i, 'Stock must be 0 or greater.'],
    ['stock is not a whole number', { stock: '1.5' }, /^stock/i, 'Stock must be a whole number.'],
  ])('shows error when %s', async (_case, overrides, label, message) => {
    const requests = recordRequests()
    const { user } = renderModal()
    await fillForm(user, overrides)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true')
    expect(requests).toHaveLength(0)
  })
})

describe('ProductFormModal saving', () => {
  it('sends the entered product when Save is clicked', async () => {
    const requests = recordRequests()
    const { user } = renderModal()
    await fillForm(user)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests[0]).toEqual({
      name: 'Keyboard',
      description: 'Mechanical keyboard',
      price: '49.99',
      stock: 10,
    })
  })

  it('disables Save and shows a spinner while saving', async () => {
    let respond: () => void = () => {}
    const answered = new Promise<void>((resolve) => (respond = resolve))
    server.use(
      http.post(productsUrl, async () => {
        await answered
        return HttpResponse.json(buildProduct(), { status: 201 })
      }),
    )
    const { user, onOpenChange } = renderModal()
    await fillForm(user)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    const saving = await screen.findByRole('button', { name: /saving/i })
    expect(saving).toBeDisabled()
    respond()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})

describe('ProductFormModal server errors', () => {
  it('shows the server field error under the field and keeps the form open', async () => {
    server.use(
      http.post(productsUrl, () =>
        HttpResponse.json(
          { name: ['Ensure this field has no more than 255 characters.'] },
          { status: 400 },
        ),
      ),
    )
    const { user, onOpenChange } = renderModal()
    await fillForm(user)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('Ensure this field has no more than 255 characters.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^name/i)).toHaveAttribute('aria-invalid', 'true')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('enables Save again after a failed request', async () => {
    server.use(
      http.post(productsUrl, () => HttpResponse.json({ detail: 'boom' }, { status: 500 })),
    )
    const { user, onOpenChange } = renderModal()
    await fillForm(user)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled())
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
