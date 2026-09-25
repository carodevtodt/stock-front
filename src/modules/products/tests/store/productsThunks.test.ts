import { http, HttpResponse } from 'msw'
import { makeStore } from '@/app/store'
import { server } from '@/test/server'
import { createProduct } from '../../store/productsThunks'
import { buildCreateProductInput, buildProduct } from '../mocks/product.factory'
import { productsUrl } from '../mocks/products.handlers'

const input = buildCreateProductInput({ description: null })

describe('createProduct thunk', () => {
  it('fulfills with the created product', async () => {
    const created = buildProduct({ ...input })
    server.use(http.post(productsUrl, () => HttpResponse.json(created, { status: 201 })))
    const store = makeStore()

    const result = await store.dispatch(createProduct(input))

    expect(createProduct.fulfilled.match(result)).toBe(true)
    expect(result.payload).toEqual(created)
  })

  it('rejects with the ApiError field errors on 400', async () => {
    server.use(
      http.post(productsUrl, () =>
        HttpResponse.json({ name: ['This field may not be blank.'] }, { status: 400 }),
      ),
    )
    const store = makeStore()

    const result = await store.dispatch(createProduct({ ...input, name: '' }))

    expect(createProduct.rejected.match(result)).toBe(true)
    expect(result.payload).toMatchObject({
      status: 400,
      fieldErrors: { name: ['This field may not be blank.'] },
    })
  })
})
