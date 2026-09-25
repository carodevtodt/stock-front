import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { Toaster } from '@/shared/components/ui/sonner'
import { renderWithStore } from '@/test/renderWithStore'
import { server } from '@/test/server'
import { ProductFormModal } from '../../views/ProductListView/components/ProductFormModal'
import type { Product, ProductFormValues } from '../../types/product'
import { buildProduct } from '../mocks/product.factory'
import { productUrl, productsUrl } from '../mocks/products.handlers'

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

/** Serve `product` at `GET /products/{id}/`; returns the ids of the detail requests. */
function serveProduct(product: Product) {
  const requests: string[] = []
  server.use(
    http.get(productUrl(product.id), ({ request }) => {
      requests.push(new URL(request.url).pathname)
      return HttpResponse.json(product)
    }),
  )
  return requests
}

function renderEditModal(product: Product) {
  const user = userEvent.setup()
  const onOpenChange = vi.fn()
  const onNotFound = vi.fn()
  // The Toaster normally lives in the app layout; mount one so toasts can be asserted here.
  const utils = renderWithStore(
    <>
      <ProductFormModal
        open
        productId={product.id}
        onOpenChange={onOpenChange}
        onNotFound={onNotFound}
      />
      <Toaster />
    </>,
  )
  return { user, onOpenChange, onNotFound, ...utils }
}

/** Wait until the edit form shows the product's name (preload done). */
async function waitForPreload(name = 'Keyboard') {
  await waitFor(() => expect(screen.getByLabelText(/^name/i)).toHaveValue(name))
}

const editedProduct = buildProduct({
  name: 'Keyboard',
  description: 'Mechanical keyboard',
  price: '49.99',
  stock: 10,
})

describe('ProductFormModal edit mode', () => {
  it('requests the product by id and fills the fields', async () => {
    const requests = serveProduct(editedProduct)
    renderEditModal(editedProduct)

    expect(await screen.findByRole('dialog', { name: 'Edit product' })).toBeInTheDocument()
    await waitForPreload()
    expect(requests).toEqual([`/api/products/${editedProduct.id}/`])
    expect(screen.getByLabelText(/^description/i)).toHaveValue('Mechanical keyboard')
    expect(screen.getByLabelText(/^price/i)).toHaveValue('49.99')
    expect(screen.getByLabelText(/^stock/i)).toHaveValue('10')
  })

  it('shows skeletons and disables Save while the product loads', async () => {
    server.use(
      http.get(productUrl(editedProduct.id), async () => {
        await delay('infinite')
        return HttpResponse.json(editedProduct)
      }),
    )
    renderEditModal(editedProduct)

    await screen.findByRole('dialog', { name: 'Edit product' })

    expect(screen.getAllByTestId('product-form-skeleton')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.queryByRole('textbox', { name: /^name/i })).not.toBeInTheDocument()
  })

  it('shows an empty Description when the product has none', async () => {
    const noDescription = buildProduct({ name: 'Mouse', description: null })
    serveProduct(noDescription)
    renderEditModal(noDescription)

    await waitForPreload('Mouse')

    expect(screen.getByLabelText(/^description/i)).toHaveValue('')
  })

  it('still shows "New product" when no productId is given', async () => {
    const requests: string[] = []
    server.use(
      http.get(`${productsUrl}:id/`, ({ params }) => {
        requests.push(params.id as string)
        return HttpResponse.json(editedProduct)
      }),
    )
    renderModal()

    expect(await screen.findByRole('dialog', { name: 'New product' })).toBeInTheDocument()
    expect(screen.getByLabelText(/^name/i)).toHaveValue('')
    expect(screen.queryByTestId('product-form-skeleton')).not.toBeInTheDocument()
    expect(requests).toHaveLength(0)
  })
})

/** Record the body of every `PUT /products/{id}/` and answer with the updated product. */
function recordUpdates(product: Product) {
  const bodies: unknown[] = []
  server.use(
    http.put(productUrl(product.id), async ({ request }) => {
      const body = (await request.json()) as object
      bodies.push(body)
      return HttpResponse.json({ ...product, ...body })
    }),
  )
  return bodies
}

async function renderLoadedEditModal() {
  serveProduct(editedProduct)
  const utils = renderEditModal(editedProduct)
  await waitForPreload()
  return utils
}

describe('ProductFormModal edit saving', () => {
  it('shows "Name is required." and sends no update when Name is cleared', async () => {
    const updates = recordUpdates(editedProduct)
    const { user } = await renderLoadedEditModal()

    await user.clear(screen.getByLabelText(/^name/i))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
    expect(updates).toHaveLength(0)
  })

  it('shows "Price must be greater than 0." and sends no update when Price is 0', async () => {
    const updates = recordUpdates(editedProduct)
    const { user } = await renderLoadedEditModal()

    await fillForm(user, { price: '0' })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Price must be greater than 0.')).toBeInTheDocument()
    expect(updates).toHaveLength(0)
  })

  it('PUTs the edited product to its id when Save is clicked', async () => {
    const updates = recordUpdates(editedProduct)
    const { user } = await renderLoadedEditModal()

    await fillForm(user, {
      name: 'Keyboard Pro',
      description: 'Mechanical keyboard, RGB',
      price: '59.99',
      stock: '8',
    })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(updates).toHaveLength(1))
    expect(updates[0]).toEqual({
      name: 'Keyboard Pro',
      description: 'Mechanical keyboard, RGB',
      price: '59.99',
      stock: 8,
    })
  })

  it('sends a null description when Description is cleared', async () => {
    const updates = recordUpdates(editedProduct)
    const { user } = await renderLoadedEditModal()

    await user.clear(screen.getByLabelText(/^description/i))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(updates).toHaveLength(1))
    expect(updates[0]).toMatchObject({ description: null })
  })

  it('disables Save and shows a spinner while the update is saving', async () => {
    let respond: () => void = () => {}
    const answered = new Promise<void>((resolve) => (respond = resolve))
    server.use(
      http.put(productUrl(editedProduct.id), async () => {
        await answered
        return HttpResponse.json(editedProduct)
      }),
    )
    const { user, onOpenChange } = await renderLoadedEditModal()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('button', { name: /saving/i })).toBeDisabled()
    respond()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})

describe('ProductFormModal edit errors', () => {
  it('shows the server field error under Price and keeps the edit form open', async () => {
    server.use(
      http.put(productUrl(editedProduct.id), () =>
        HttpResponse.json(
          { price: ['Ensure that there are no more than 8 digits before the decimal point.'] },
          { status: 400 },
        ),
      ),
    )
    const { user, onOpenChange } = await renderLoadedEditModal()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('Ensure that there are no more than 8 digits before the decimal point.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^price/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText('Could not update product.')).not.toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('shows "Could not update product." and keeps the values when the update fails', async () => {
    server.use(
      http.put(productUrl(editedProduct.id), () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )
    const { user, onOpenChange } = await renderLoadedEditModal()

    await fillForm(user, { name: 'Keyboard Pro' })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Could not update product.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^name/i)).toHaveValue('Keyboard Pro')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled())
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('shows "Could not update product." when the network fails on save', async () => {
    server.use(http.put(productUrl(editedProduct.id), () => HttpResponse.error()))
    const { user, onOpenChange } = await renderLoadedEditModal()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Could not update product.')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('shows "Could not update product." and closes when loading the product fails', async () => {
    server.use(
      http.get(productUrl(editedProduct.id), () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )
    const { onOpenChange, onNotFound } = renderEditModal(editedProduct)

    expect(await screen.findByText('Could not update product.')).toBeInTheDocument()
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onNotFound).not.toHaveBeenCalled()
  })
})
