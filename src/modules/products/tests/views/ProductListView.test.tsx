import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { appRoutes } from '@/app/router'
import { renderWithStore } from '@/test/renderWithStore'
import { server } from '@/test/server'
import { selectProducts } from '../../store/productsSelectors'
import { productsUrl } from '../mocks/products.handlers'

function renderProductsPage() {
  const user = userEvent.setup()
  const utils = renderWithStore(null, { routes: appRoutes, route: '/products' })
  return { user, ...utils }
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

  it('shows "Product created.", closes the form and adds the product to the list', async () => {
    const { user, store } = renderProductsPage()
    await openForm(user)

    await user.type(screen.getByLabelText(/^name/i), 'Keyboard')
    await user.type(screen.getByLabelText(/^price/i), '49.99')
    await user.type(screen.getByLabelText(/^stock/i), '10')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Product created.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(selectProducts(store.getState())[0]).toMatchObject({ name: 'Keyboard', stock: 10 })
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
