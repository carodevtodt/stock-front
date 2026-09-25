import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { appRoutes } from '@/app/router'
import { renderWithStore } from '@/test/renderWithStore'
import { server } from '@/test/server'
import { LIST_PRODUCTS_ERROR } from '../../constants'
import type { CreateProductInput, Product, UpdateProductInput } from '../../types/product'
import { buildProduct, buildProductsPage } from '../mocks/product.factory'
import { productsUrl } from '../mocks/products.handlers'

function renderProductsPage() {
  const user = userEvent.setup()
  const utils = renderWithStore(null, { routes: appRoutes, route: '/products' })
  return { user, ...utils }
}

/** Serve `products` as page 1 of the list. */
function listPage(products: Product[], options?: { count?: number }) {
  server.use(http.get(productsUrl, () => HttpResponse.json(buildProductsPage(products, options))))
}

/** Product rows of the table, once loaded (skips the header row and skeleton rows). */
async function findProductRows() {
  return waitFor(() => {
    const rows = within(screen.getByRole('table'))
      .getAllByRole('row')
      .slice(1)
      .filter((row) => !row.hasAttribute('data-testid'))
    expect(rows.length).toBeGreaterThan(0)
    return rows
  })
}

/**
 * Serve `count` products across pages of 10, named "P<page>-<nn>" (e.g. "P2-01"), and record
 * the page number of every list request.
 */
function servePages(count: number, pages: string[] = []) {
  server.use(
    http.get(productsUrl, ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'))
      pages.push(String(page))
      const size = Math.min(10, count - (page - 1) * 10)
      const products = Array.from({ length: size }, (_, i) =>
        buildProduct({ name: `P${page}-${String(i + 1).padStart(2, '0')}` }),
      )
      return HttpResponse.json(buildProductsPage(products, { count, page }))
    }),
  )
  return pages
}

/**
 * Stateful fake backend: GET serves `products` in pages of 10 (newest first, as given) and POST
 * adds the created product to the top. Records the page number of every list request.
 */
function serveCatalog(products: Product[]) {
  const catalog = [...products]
  const pages: string[] = []
  server.use(
    http.get(productsUrl, ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'))
      pages.push(String(page))
      const results = catalog.slice((page - 1) * 10, page * 10)
      return HttpResponse.json(buildProductsPage(results, { count: catalog.length, page }))
    }),
    http.post(productsUrl, async ({ request }) => {
      const created = buildProduct({ ...((await request.json()) as CreateProductInput) })
      catalog.unshift(created)
      return HttpResponse.json(created, { status: 201 })
    }),
  )
  return pages
}

/** Open the form from the (only) Add product button and save a valid product. */
async function createProduct(user: ReturnType<typeof userEvent.setup>, name: string) {
  await openForm(user)
  await user.type(screen.getByLabelText(/^name/i), name)
  await user.type(screen.getByLabelText(/^price/i), '49.99')
  await user.type(screen.getByLabelText(/^stock/i), '10')
  await user.click(screen.getByRole('button', { name: 'Save' }))
}

function paginationNav() {
  return within(screen.getByRole('navigation', { name: 'pagination' }))
}

/** Texts of the data cells of a row (Name, Description, Price, Stock); the last cell holds the actions. */
function rowTexts(row: HTMLElement) {
  return within(row)
    .getAllByRole('cell')
    .slice(0, -1)
    .map((cell) => cell.textContent)
}

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /add product/i }))
  return screen.findByRole('dialog', { name: 'New product' })
}

describe('ProductListView', () => {
  it('shows the Add product button on /products', async () => {
    renderProductsPage()

    expect(await screen.findByRole('button', { name: /add product/i })).toBeVisible()
  })

  it('opens an empty New product form when Add product is clicked', async () => {
    const { user } = renderProductsPage()

    await openForm(user)

    expect(screen.getByLabelText(/^name/i)).toHaveValue('')
    expect(screen.getByLabelText(/^description/i)).toHaveValue('')
    expect(screen.getByLabelText(/^price/i)).toHaveValue('')
    expect(screen.getByLabelText(/^stock/i)).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('closes the form without a request when Cancel is clicked', async () => {
    let requests = 0
    server.use(
      http.post(productsUrl, () => {
        requests += 1
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const { user } = renderProductsPage()
    await openForm(user)

    await user.type(screen.getByLabelText(/^name/i), 'Keyboard')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(requests).toBe(0)
  })

  it('shows an empty form without errors when reopened', async () => {
    const { user } = renderProductsPage()
    await openForm(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.type(screen.getByLabelText(/^name/i), 'Keyboard')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await openForm(user)

    expect(screen.getByLabelText(/^name/i)).toHaveValue('')
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument()
    expect(screen.queryByText('Price is required.')).not.toBeInTheDocument()
  })

  it('shows "Product created.", closes the form and shows the product in the first row', async () => {
    serveCatalog([buildProduct({ name: 'Mouse' })])
    const { user } = renderProductsPage()
    await findProductRows()

    await createProduct(user, 'Keyboard')

    expect(await screen.findByText('Product created.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const rows = await findProductRows()
    expect(rowTexts(rows[0])).toEqual(['Keyboard', '—', '49.99', '10'])
    expect(rowTexts(rows[1])[0]).toBe('Mouse')
  })

  it('replaces the empty state with the created product and "Showing 1–1 of 1"', async () => {
    serveCatalog([])
    const { user } = renderProductsPage()
    await screen.findByText('No products yet, please add one.')

    await createProduct(user, 'Keyboard')

    expect(await screen.findByText('Product created.')).toBeInTheDocument()
    expect(screen.queryByText('No products yet, please add one.')).not.toBeInTheDocument()
    expect(rowTexts((await findProductRows())[0])[0]).toBe('Keyboard')
    expect(screen.getByText('Showing 1–1 of 1')).toBeInTheDocument()
  })

  it('shows "Product created." and page 1 with the product on top after creating from page 2', async () => {
    const catalog = Array.from({ length: 25 }, (_, i) => buildProduct({ name: `Product ${i + 1}` }))
    const pages = serveCatalog(catalog)
    const { user } = renderProductsPage()
    await screen.findByText('Showing 1–10 of 25')
    await user.click(paginationNav().getByRole('link', { name: /next/i }))
    await screen.findByText('Showing 11–20 of 25')

    await createProduct(user, 'New one')

    expect(await screen.findByText('Product created.')).toBeInTheDocument()
    expect(await screen.findByText('Showing 1–10 of 26')).toBeInTheDocument()
    expect(pages.at(-1)).toBe('1')
    expect(paginationNav().getByRole('link', { name: '1' })).toHaveAttribute('aria-current', 'page')
    expect(rowTexts((await findProductRows())[0])[0]).toBe('New one')
  })

  it('shows the products in a table with Name, Description, Price and Stock', async () => {
    listPage([
      buildProduct({ name: 'Keyboard', description: 'Mechanical keyboard', price: '49.99', stock: 10 }),
      buildProduct({ name: 'Mouse', description: null, price: '19.90', stock: 0 }),
    ])
    renderProductsPage()

    const table = await screen.findByRole('table')
    for (const header of ['Name', 'Description', 'Price', 'Stock']) {
      expect(within(table).getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    const rows = await findProductRows()
    expect(rowTexts(rows[0])).toEqual(['Keyboard', 'Mechanical keyboard', '49.99', '10'])
    expect(rowTexts(rows[1])).toEqual(['Mouse', '—', '19.90', '0'])
  })

  it('requests page 1 when the page opens', async () => {
    const pages: (string | null)[] = []
    server.use(
      http.get(productsUrl, ({ request }) => {
        pages.push(new URL(request.url).searchParams.get('page'))
        return HttpResponse.json(buildProductsPage([buildProduct()]))
      }),
    )
    renderProductsPage()

    await findProductRows()
    expect(pages).toEqual(['1'])
  })

  it('shows one Add product button above the table when there are products', async () => {
    listPage([buildProduct()])
    renderProductsPage()

    await findProductRows()
    expect(screen.getAllByRole('button', { name: /add product/i })).toHaveLength(1)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('shows skeleton rows while the products are loading', async () => {
    server.use(http.get(productsUrl, () => delay('infinite')))
    renderProductsPage()

    expect((await screen.findAllByTestId('product-row-skeleton')).length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('cell').filter((cell) => cell.textContent)).toHaveLength(0)
    expect(screen.queryByText('No products yet, please add one.')).not.toBeInTheDocument()
  })

  it('shows "No products yet, please add one." and one Add button when there are no products', async () => {
    renderProductsPage()

    expect(await screen.findByText('No products yet, please add one.')).toBeVisible()
    expect(screen.getAllByRole('button', { name: /add product/i })).toHaveLength(1)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('opens the New product form from the empty state', async () => {
    const { user } = renderProductsPage()
    await screen.findByText('No products yet, please add one.')

    await user.click(screen.getByRole('button', { name: /add product/i }))

    expect(await screen.findByRole('dialog', { name: 'New product' })).toBeInTheDocument()
  })

  it('shows "Could not load products." and Retry when the server fails', async () => {
    server.use(http.get(productsUrl, () => HttpResponse.json({ detail: 'boom' }, { status: 500 })))
    renderProductsPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(LIST_PRODUCTS_ERROR)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('No products yet, please add one.')).not.toBeInTheDocument()
  })

  it('shows "Could not load products." when the network fails', async () => {
    server.use(http.get(productsUrl, () => HttpResponse.error()))
    renderProductsPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(LIST_PRODUCTS_ERROR)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible()
  })

  it('loads the products again when Retry is clicked', async () => {
    let calls = 0
    server.use(
      http.get(productsUrl, () => {
        calls += 1
        if (calls === 1) return HttpResponse.json({}, { status: 500 })
        return HttpResponse.json(buildProductsPage([buildProduct({ name: 'Keyboard' })]))
      }),
    )
    const { user } = renderProductsPage()
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    const rows = await findProductRows()
    expect(rowTexts(rows[0])[0]).toBe('Keyboard')
    expect(screen.queryByText(LIST_PRODUCTS_ERROR)).not.toBeInTheDocument()
  })

  it('sends one request for page 1 and shows only the returned products', async () => {
    const pages = servePages(25)
    renderProductsPage()

    const rows = await findProductRows()
    expect(pages).toEqual(['1'])
    expect(rows.map((row) => rowTexts(row)[0])).toEqual(
      Array.from({ length: 10 }, (_, i) => `P1-${String(i + 1).padStart(2, '0')}`),
    )
  })

  it('shows "Showing 1–10 of 25", page links 1–3 and a disabled Previous on the first page', async () => {
    servePages(25)
    renderProductsPage()

    expect(await screen.findByText('Showing 1–10 of 25')).toBeInTheDocument()
    const nav = paginationNav()
    for (const n of ['1', '2', '3']) expect(nav.getByRole('link', { name: n })).toBeInTheDocument()
    expect(nav.queryByRole('link', { name: '4' })).not.toBeInTheDocument()
    expect(nav.getByRole('link', { name: '1' })).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: /previous/i })).toHaveAttribute('aria-disabled', 'true')
    expect(nav.getByRole('link', { name: /next/i })).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('shows page 2 when Next is clicked', async () => {
    const pages = servePages(25)
    const { user } = renderProductsPage()
    await screen.findByText('Showing 1–10 of 25')

    await user.click(paginationNav().getByRole('link', { name: /next/i }))

    expect(await screen.findByText('Showing 11–20 of 25')).toBeInTheDocument()
    expect(rowTexts((await findProductRows())[0])[0]).toBe('P2-01')
    expect(pages).toEqual(['1', '2'])
    expect(paginationNav().getByRole('link', { name: '2' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows the last page with Next disabled when its page link is clicked', async () => {
    const pages = servePages(25)
    const { user } = renderProductsPage()
    await screen.findByText('Showing 1–10 of 25')

    await user.click(paginationNav().getByRole('link', { name: '3' }))

    expect(await screen.findByText('Showing 21–25 of 25')).toBeInTheDocument()
    expect(await findProductRows()).toHaveLength(5)
    expect(pages).toEqual(['1', '3'])
    expect(paginationNav().getByRole('link', { name: /next/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(paginationNav().getByRole('link', { name: /previous/i })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('sends no request when the disabled Previous is clicked', async () => {
    const pages = servePages(25)
    const { user } = renderProductsPage()
    await screen.findByText('Showing 1–10 of 25')

    await user.click(paginationNav().getByRole('link', { name: /previous/i }))

    expect(pages).toEqual(['1'])
    expect(paginationNav().getByRole('link', { name: '1' })).toHaveAttribute('aria-current', 'page')
  })

  it('disables Previous and Next when there is a single page', async () => {
    servePages(3)
    renderProductsPage()

    expect(await screen.findByText('Showing 1–3 of 3')).toBeInTheDocument()
    const nav = paginationNav()
    expect(nav.getAllByRole('link', { name: /^\d+$/ })).toHaveLength(1)
    expect(nav.getByRole('link', { name: /previous/i })).toHaveAttribute('aria-disabled', 'true')
    expect(nav.getByRole('link', { name: /next/i })).toHaveAttribute('aria-disabled', 'true')
  })

  async function submitValidProduct(user: ReturnType<typeof userEvent.setup>) {
    await openForm(user)
    await user.type(screen.getByLabelText(/^name/i), 'Keyboard')
    await user.type(screen.getByLabelText(/^price/i), '49.99')
    await user.type(screen.getByLabelText(/^stock/i), '10')
    await user.click(screen.getByRole('button', { name: 'Save' }))
  }

  it('shows "Could not create product." and keeps the values when the server fails', async () => {
    server.use(
      http.post(productsUrl, () => HttpResponse.json({ detail: 'boom' }, { status: 500 })),
    )
    const { user } = renderProductsPage()

    await submitValidProduct(user)

    expect(await screen.findByText('Could not create product.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'New product' })).toBeInTheDocument()
    expect(screen.getByLabelText(/^name/i)).toHaveValue('Keyboard')
    expect(screen.getByLabelText(/^price/i)).toHaveValue('49.99')
  })

  it('shows "Could not create product." when the network fails', async () => {
    server.use(http.post(productsUrl, () => HttpResponse.error()))
    const { user } = renderProductsPage()

    await submitValidProduct(user)

    expect(await screen.findByText('Could not create product.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'New product' })).toBeInTheDocument()
  })
})

/**
 * Stateful fake backend for editing: GET lists `products` in pages of 10, GET/PUT `/products/{id}/`
 * read and replace one of them. Records the page of every list request and every PUT body.
 */
function serveEditableCatalog(products: Product[]) {
  const catalog = [...products]
  const pages: string[] = []
  const updates: { id: string; body: UpdateProductInput }[] = []
  server.use(
    http.get(productsUrl, ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'))
      pages.push(String(page))
      const results = catalog.slice((page - 1) * 10, page * 10)
      return HttpResponse.json(buildProductsPage(results, { count: catalog.length, page }))
    }),
    http.get(`${productsUrl}:id/`, ({ params }) => {
      const product = catalog.find((p) => p.id === params.id)
      if (!product) return HttpResponse.json({ detail: 'Product not found.' }, { status: 404 })
      return HttpResponse.json(product)
    }),
    http.put(`${productsUrl}:id/`, async ({ params, request }) => {
      const body = (await request.json()) as UpdateProductInput
      updates.push({ id: params.id as string, body })
      const index = catalog.findIndex((p) => p.id === params.id)
      if (index === -1) return HttpResponse.json({ detail: 'Product not found.' }, { status: 404 })
      catalog[index] = { ...catalog[index], ...body, updated_at: '2026-09-25T09:30:00Z' }
      return HttpResponse.json(catalog[index])
    }),
  )
  return { catalog, pages, updates }
}

const keyboard = () =>
  buildProduct({ name: 'Keyboard', description: 'Mechanical keyboard', price: '49.99', stock: 10 })
const mouse = () => buildProduct({ name: 'Mouse', description: null, price: '19.90', stock: 0 })

/** Click the row's Edit button and wait until the form is preloaded with `name`. */
async function openEditForm(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole('button', { name: `Edit ${name}` }))
  const dialog = await screen.findByRole('dialog', { name: 'Edit product' })
  await waitFor(() => expect(screen.getByLabelText(/^name/i)).toHaveValue(name))
  return dialog
}

describe('ProductListView edit', () => {
  it('shows an Edit button named after the product in each row', async () => {
    serveEditableCatalog([keyboard(), mouse()])
    renderProductsPage()

    const rows = await findProductRows()

    expect(within(rows[0]).getByRole('button', { name: 'Edit Keyboard' })).toBeInTheDocument()
    expect(within(rows[1]).getByRole('button', { name: 'Edit Mouse' })).toBeInTheDocument()
  })

  it('opens "Edit product" preloaded with the row\'s product when Edit is clicked', async () => {
    serveEditableCatalog([keyboard(), mouse()])
    const { user } = renderProductsPage()

    await openEditForm(user, 'Keyboard')

    expect(screen.getByLabelText(/^name/i)).toHaveValue('Keyboard')
    expect(screen.getByLabelText(/^description/i)).toHaveValue('Mechanical keyboard')
    expect(screen.getByLabelText(/^price/i)).toHaveValue('49.99')
    expect(screen.getByLabelText(/^stock/i)).toHaveValue('10')
  })

  it('closes the edit form without an update request when Cancel is clicked', async () => {
    const { updates } = serveEditableCatalog([keyboard()])
    const { user } = renderProductsPage()
    await openEditForm(user, 'Keyboard')

    await user.type(screen.getByLabelText(/^name/i), ' Pro')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(updates).toHaveLength(0)
    expect(rowTexts((await findProductRows())[0])[0]).toBe('Keyboard')
  })

  it('shows the second product\'s values after editing another one', async () => {
    serveEditableCatalog([keyboard(), mouse()])
    const { user } = renderProductsPage()
    await openEditForm(user, 'Keyboard')
    await user.clear(screen.getByLabelText(/^name/i))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Name is required.')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await openEditForm(user, 'Mouse')

    expect(screen.getByLabelText(/^description/i)).toHaveValue('')
    expect(screen.getByLabelText(/^price/i)).toHaveValue('19.90')
    expect(screen.getByLabelText(/^stock/i)).toHaveValue('0')
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument()
  })

  it('opens an empty New product form after an edit was closed', async () => {
    serveEditableCatalog([keyboard()])
    const { user } = renderProductsPage()
    await openEditForm(user, 'Keyboard')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await openForm(user)

    expect(screen.getByLabelText(/^name/i)).toHaveValue('')
    expect(screen.getByLabelText(/^description/i)).toHaveValue('')
    expect(screen.getByLabelText(/^price/i)).toHaveValue('')
    expect(screen.getByLabelText(/^stock/i)).toHaveValue('')
  })
})

describe('ProductListView edit saving', () => {
  it('shows "Product updated.", closes the form and updates the row in place', async () => {
    const { pages } = serveEditableCatalog([keyboard(), mouse()])
    const { user } = renderProductsPage()
    await openEditForm(user, 'Keyboard')
    const listRequests = pages.length

    await user.type(screen.getByLabelText(/^name/i), ' Pro')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Product updated.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const rows = await findProductRows()
    expect(rowTexts(rows[0])).toEqual(['Keyboard Pro', 'Mechanical keyboard', '49.99', '10'])
    expect(rowTexts(rows[1])[0]).toBe('Mouse')
    expect(pages).toHaveLength(listRequests)
  })

  it('keeps page 2 and shows the updated row after editing on page 2', async () => {
    const catalog = Array.from({ length: 25 }, (_, i) => buildProduct({ name: `Product ${i + 1}` }))
    serveEditableCatalog(catalog)
    const { user } = renderProductsPage()
    await screen.findByText('Showing 1–10 of 25')
    await user.click(paginationNav().getByRole('link', { name: /next/i }))
    await screen.findByText('Showing 11–20 of 25')
    await openEditForm(user, 'Product 11')

    await user.type(screen.getByLabelText(/^name/i), ' edited')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Product updated.')).toBeInTheDocument()
    await waitFor(() =>
      expect(rowTexts(screen.getAllByRole('row')[1])[0]).toBe('Product 11 edited'),
    )
    expect(paginationNav().getByRole('link', { name: '2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Showing 11–20 of 25')).toBeInTheDocument()
  })
})

describe('ProductListView edit not found', () => {
  it('shows "Product not found.", closes the form and reloads the page when the product is gone on open', async () => {
    const { catalog, pages } = serveEditableCatalog([keyboard(), mouse()])
    const { user } = renderProductsPage()
    await findProductRows()
    catalog.splice(0, 1) // deleted by someone else after the list loaded
    const listRequests = pages.length

    await user.click(screen.getByRole('button', { name: 'Edit Keyboard' }))

    expect(await screen.findByText('Product not found.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(pages.slice(listRequests)).toEqual(['1']))
    await waitFor(() => expect(rowTexts((screen.getAllByRole('row'))[1])[0]).toBe('Mouse'))
  })

  it('shows "Product not found.", closes the form and reloads the page when the product is gone on save', async () => {
    const { catalog } = serveEditableCatalog([keyboard(), mouse()])
    const { user } = renderProductsPage()
    await openEditForm(user, 'Keyboard')
    catalog.splice(0, 1) // deleted by someone else while the form is open

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Product not found.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => {
      const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
      expect(rows.map((row) => rowTexts(row)[0])).toEqual(['Mouse'])
    })
  })
})

/**
 * Stateful fake backend: GET serves `products` in pages of 10 and DELETE removes a product
 * (204), or answers 404 when it's already gone. Records list pages and deleted ids.
 */
function serveDeletableCatalog(products: Product[]) {
  const catalog = [...products]
  const pages: string[] = []
  const deletes: string[] = []
  server.use(
    http.get(productsUrl, ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'))
      pages.push(String(page))
      const results = catalog.slice((page - 1) * 10, page * 10)
      return HttpResponse.json(buildProductsPage(results, { count: catalog.length, page }))
    }),
    http.delete(`${productsUrl}:id/`, ({ params }) => {
      deletes.push(params.id as string)
      const index = catalog.findIndex((p) => p.id === params.id)
      if (index === -1) return HttpResponse.json({ detail: 'Product not found.' }, { status: 404 })
      catalog.splice(index, 1)
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return { catalog, pages, deletes }
}

/** Products named "P01", "P02", … in list order (newest first). */
function namedProducts(count: number) {
  return Array.from({ length: count }, (_, i) =>
    buildProduct({ name: `P${String(i + 1).padStart(2, '0')}` }),
  )
}

/** Click the row's Delete button and return the confirmation dialog. */
async function openDeleteConfirm(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole('button', { name: `Delete ${name}` }))
  return screen.findByRole('alertdialog', { name: 'Delete product?' })
}

describe('ProductListView delete', () => {
  it('shows a Delete button named after the product in each row', async () => {
    serveDeletableCatalog([keyboard(), mouse()])
    renderProductsPage()

    const [first, second] = await findProductRows()

    expect(within(first).getByRole('button', { name: 'Delete Keyboard' })).toBeInTheDocument()
    expect(within(second).getByRole('button', { name: 'Delete Mouse' })).toBeInTheDocument()
  })

  it('opens "Delete product?" for the row\'s product without sending a request', async () => {
    const { deletes } = serveDeletableCatalog([keyboard(), mouse()])
    const { user } = renderProductsPage()

    const dialog = await openDeleteConfirm(user, 'Keyboard')

    expect(within(dialog).getByText('"Keyboard" will be permanently deleted.')).toBeInTheDocument()
    expect(deletes).toEqual([])
  })

  it('closes the confirmation and keeps the row when Cancel is clicked', async () => {
    const { deletes } = serveDeletableCatalog([keyboard(), mouse()])
    const { user } = renderProductsPage()
    const dialog = await openDeleteConfirm(user, 'Keyboard')

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(deletes).toEqual([])
    expect(rowTexts((await findProductRows())[0])[0]).toBe('Keyboard')
  })

  it('closes the confirmation without a delete request when Escape is pressed', async () => {
    const { deletes } = serveDeletableCatalog([keyboard(), mouse()])
    const { user } = renderProductsPage()
    await openDeleteConfirm(user, 'Keyboard')

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(deletes).toEqual([])
  })

  it('names the second product after cancelling the first confirmation', async () => {
    serveDeletableCatalog([keyboard(), mouse()])
    const { user } = renderProductsPage()
    const first = await openDeleteConfirm(user, 'Keyboard')
    await user.click(within(first).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

    const second = await openDeleteConfirm(user, 'Mouse')

    expect(within(second).getByText('"Mouse" will be permanently deleted.')).toBeInTheDocument()
  })
})

describe('ProductListView delete confirm', () => {
  it('shows "Product deleted.", closes the confirmation and removes the row', async () => {
    const { pages } = serveDeletableCatalog([keyboard(), mouse()])
    const { user } = renderProductsPage()
    const dialog = await openDeleteConfirm(user, 'Keyboard')

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Product deleted.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() => {
      const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
      expect(rows.map((row) => rowTexts(row)[0])).toEqual(['Mouse'])
    })
    expect(screen.getByText('Showing 1–1 of 1')).toBeInTheDocument()
    expect(pages).toEqual(['1'])
  })

  it('shows "Product no longer exists." and removes the row when the product is already gone', async () => {
    const { catalog } = serveDeletableCatalog([keyboard(), mouse()])
    const { user } = renderProductsPage()
    await findProductRows()
    catalog.splice(0, 1) // deleted by someone else after the list loaded
    const dialog = await openDeleteConfirm(user, 'Keyboard')

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Product no longer exists.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() => {
      const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
      expect(rows.map((row) => rowTexts(row)[0])).toEqual(['Mouse'])
    })
  })
})

describe('ProductListView delete error', () => {
  it('keeps the row when the delete fails', async () => {
    serveDeletableCatalog([keyboard(), mouse()])
    server.use(
      http.delete(`${productsUrl}:id/`, () => HttpResponse.json({ detail: 'boom' }, { status: 500 })),
    )
    const { user } = renderProductsPage()
    const dialog = await openDeleteConfirm(user, 'Keyboard')

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Could not delete product.')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(rowTexts((await findProductRows())[0])[0]).toBe('Keyboard')
  })
})

describe('ProductListView page after a delete', () => {
  async function deleteProduct(user: ReturnType<typeof userEvent.setup>, name: string) {
    const dialog = await openDeleteConfirm(user, name)
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await screen.findByText('Product deleted.')
  }

  async function goToPage(user: ReturnType<typeof userEvent.setup>, page: string) {
    await findProductRows()
    await user.click(paginationNav().getByRole('link', { name: page }))
    await waitFor(() =>
      expect(paginationNav().getByRole('link', { name: page })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    )
    await findProductRows()
  }

  const shownNames = () =>
    within(screen.getByRole('table'))
      .getAllByRole('row')
      .slice(1)
      .map((row) => rowTexts(row)[0])

  it('requests page 1 again and shows "Showing 1–10 of 24" after a delete with more pages', async () => {
    const { pages } = serveDeletableCatalog(namedProducts(25))
    const { user } = renderProductsPage()

    await deleteProduct(user, 'P01')

    await waitFor(() => expect(screen.getByText('Showing 1–10 of 24')).toBeInTheDocument())
    await waitFor(() => expect(shownNames()).toHaveLength(10))
    expect(shownNames()[0]).toBe('P02')
    expect(shownNames()[9]).toBe('P11')
    expect(pages).toEqual(['1', '1'])
  })

  it('sends no list request and shows "Showing 21–24 of 24" after a delete on the last page', async () => {
    const { pages } = serveDeletableCatalog(namedProducts(25))
    const { user } = renderProductsPage()
    await goToPage(user, '3')

    await deleteProduct(user, 'P21')

    await waitFor(() => expect(screen.getByText('Showing 21–24 of 24')).toBeInTheDocument())
    expect(shownNames()).toEqual(['P22', 'P23', 'P24', 'P25'])
    expect(pages).toEqual(['1', '3'])
  })

  it('shows page 2 after deleting the only product on page 3', async () => {
    const { pages } = serveDeletableCatalog(namedProducts(21))
    const { user } = renderProductsPage()
    await goToPage(user, '3')

    await deleteProduct(user, 'P21')

    await waitFor(() => expect(screen.getByText('Showing 11–20 of 20')).toBeInTheDocument())
    expect(paginationNav().getByRole('link', { name: '2' })).toHaveAttribute('aria-current', 'page')
    expect(pages.at(-1)).toBe('2')
  })

  it('shows the empty state without a list request after deleting the last product', async () => {
    const { pages } = serveDeletableCatalog([keyboard()])
    const { user } = renderProductsPage()

    await deleteProduct(user, 'Keyboard')

    expect(await screen.findByText('No products yet, please add one.')).toBeInTheDocument()
    expect(pages).toEqual(['1'])
  })
})
