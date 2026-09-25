import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
} from '../../services/products.api'
import { buildCreateProductInput, buildProduct, buildProductsPage } from '../mocks/product.factory'
import { productUrl, productsUrl } from '../mocks/products.handlers'

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

describe('products.api getProduct', () => {
  it('GETs /products/{id}/ and returns the product', async () => {
    const product = buildProduct()
    let requested: URL | null = null
    server.use(
      http.get(productUrl(product.id), ({ request }) => {
        requested = new URL(request.url)
        return HttpResponse.json(product)
      }),
    )

    const result = await getProduct(product.id)

    expect(result).toEqual(product)
    expect(requested!.pathname.endsWith(`/products/${product.id}/`)).toBe(true)
  })

  it('rejects getProduct with status 404 and the detail message', async () => {
    const id = crypto.randomUUID()
    server.use(
      http.get(productUrl(id), () =>
        HttpResponse.json({ detail: 'Product not found.' }, { status: 404 }),
      ),
    )

    await expect(getProduct(id)).rejects.toMatchObject({
      status: 404,
      message: 'Product not found.',
    })
  })
})

describe('products.api updateProduct', () => {
  it('PUTs the body to /products/{id}/ and returns the product', async () => {
    const product = buildProduct()
    const input = buildCreateProductInput({ name: 'Keyboard Pro', stock: 8 })
    let received: { method: string; path: string; body: unknown } | null = null
    server.use(
      http.put(productUrl(product.id), async ({ request }) => {
        received = {
          method: request.method,
          path: new URL(request.url).pathname,
          body: await request.json(),
        }
        return HttpResponse.json({ ...product, ...input })
      }),
    )

    const result = await updateProduct(product.id, input)

    expect(result).toEqual({ ...product, ...input })
    expect(received).toEqual({
      method: 'PUT',
      path: `/api/products/${product.id}/`,
      body: input,
    })
  })
})
