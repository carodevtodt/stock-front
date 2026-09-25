import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { createProduct } from '../../services/products.api'
import { buildCreateProductInput, buildProduct } from '../mocks/product.factory'
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
