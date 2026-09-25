import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { appRoutes } from '@/app/router'
import { renderWithStore } from '@/test/renderWithStore'
import { server } from '@/test/server'
import { LIST_PRODUCTS_ERROR } from '../../constants'
import type { CreateProductInput, Product } from '../../types/product'
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

function rowTexts(row: HTMLElement) {
  return within(row)
    .getAllByRole('cell')
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
