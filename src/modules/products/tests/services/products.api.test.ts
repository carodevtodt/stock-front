import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { createProduct, listProducts } from '../../services/products.api'
import { buildCreateProductInput, buildProduct, buildProductsPage } from '../mocks/product.factory'
import { productsUrl } from '../mocks/products.handlers'

const input = buildCreateProductInput()

describe('products.api createProduct', () => {
  it('POSTs the input to /products/ and returns the created product', async () => {
    const created = buildProduct(input)
    let received: { method: string; body: unknown } | null = null
    server.use(
      http.post(productsUrl, async ({ request }) => {
        received = { method: request.method, body: await request.json() }
        return HttpResponse.json(created, { status: 201 })
      }),
    )

    const result = await createProduct(input)

    expect(result).toEqual(created)
    expect(received).toEqual({ method: 'POST', body: input })
  })

  it('rejects with status 400 and field errors', async () => {
    server.use(
      http.post(productsUrl, () =>
        HttpResponse.json({ price: ['Ensure this value is greater than 0.'] }, { status: 400 }),
      ),
    )

    await expect(createProduct({ ...input, price: '0' })).rejects.toMatchObject({
      status: 400,
      fieldErrors: { price: ['Ensure this value is greater than 0.'] },
    })
  })
})

describe('products.api listProducts', () => {
  it('GETs /products/?page=N and returns the page', async () => {
    const page = buildProductsPage([buildProduct()], { count: 11, page: 2 })
    let requested: URL | null = null
    server.use(
      http.get(productsUrl, ({ request }) => {
        requested = new URL(request.url)
        return HttpResponse.json(page)
      }),
    )

    const result = await listProducts(2)

    expect(result).toEqual(page)
    expect(requested!.searchParams.get('page')).toBe('2')
  })

  it('rejects with the ApiError status on 500', async () => {
    server.use(http.get(productsUrl, () => HttpResponse.json({ detail: 'boom' }, { status: 500 })))

    await expect(listProducts(1)).rejects.toMatchObject({ status: 500 })
  })
})
