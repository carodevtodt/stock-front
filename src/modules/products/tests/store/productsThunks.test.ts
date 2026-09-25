import { http, HttpResponse } from 'msw'
import { makeStore } from '@/app/store'
import { server } from '@/test/server'
import {
  createProduct,
  deleteProduct,
  fetchProduct,
  fetchProducts,
  refillPageAfterDelete,
  updateProduct,
} from '../../store/productsThunks'
import { buildCreateProductInput, buildProduct, buildProductsPage } from '../mocks/product.factory'
import { productUrl, productsUrl } from '../mocks/products.handlers'

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

describe('fetchProducts thunk', () => {
  it('fulfills fetchProducts with the page', async () => {
    const page = buildProductsPage([buildProduct(), buildProduct({ name: 'Mouse' })])
    server.use(http.get(productsUrl, () => HttpResponse.json(page)))
    const store = makeStore()

    const result = await store.dispatch(fetchProducts(1))

    expect(fetchProducts.fulfilled.match(result)).toBe(true)
    expect(result.payload).toEqual(page)
    expect(store.getState().products).toMatchObject({ status: 'succeeded', count: 2 })
    expect(store.getState().products.items).toHaveLength(2)
  })

  it('rejects fetchProducts with the ApiError on 500', async () => {
    server.use(http.get(productsUrl, () => HttpResponse.json({ detail: 'boom' }, { status: 500 })))
    const store = makeStore()

    const result = await store.dispatch(fetchProducts(1))

    expect(fetchProducts.rejected.match(result)).toBe(true)
    expect(result.payload).toMatchObject({ status: 500 })
  })
})

describe('fetchProduct thunk', () => {
  it('fulfills fetchProduct with the product', async () => {
    const product = buildProduct()
    server.use(http.get(productUrl(product.id), () => HttpResponse.json(product)))
    const store = makeStore()

    const result = await store.dispatch(fetchProduct(product.id))

    expect(fetchProduct.fulfilled.match(result)).toBe(true)
    expect(result.payload).toEqual(product)
  })

  it('rejects fetchProduct with status 404', async () => {
    const id = crypto.randomUUID()
    server.use(
      http.get(productUrl(id), () =>
        HttpResponse.json({ detail: 'Product not found.' }, { status: 404 }),
      ),
    )
    const store = makeStore()

    const result = await store.dispatch(fetchProduct(id))

    expect(fetchProduct.rejected.match(result)).toBe(true)
    expect(result.payload).toMatchObject({ status: 404 })
  })
})

describe('updateProduct thunk', () => {
  it('fulfills updateProduct with the updated product', async () => {
    const product = buildProduct()
    const store = makeStore()

    const result = await store.dispatch(
      updateProduct({ id: product.id, input: { ...input, name: 'Keyboard Pro' } }),
    )

    expect(updateProduct.fulfilled.match(result)).toBe(true)
    expect(result.payload).toMatchObject({ id: product.id, name: 'Keyboard Pro' })
  })

  it('rejects updateProduct with the ApiError on 500', async () => {
    const id = crypto.randomUUID()
    server.use(http.put(productUrl(id), () => HttpResponse.json({ detail: 'boom' }, { status: 500 })))
    const store = makeStore()

    const result = await store.dispatch(updateProduct({ id, input }))

    expect(updateProduct.rejected.match(result)).toBe(true)
    expect(result.payload).toMatchObject({ status: 500 })
  })
})

describe('deleteProduct thunk', () => {
  it('fulfills deleteProduct with the deleted id', async () => {
    const id = crypto.randomUUID()
    const store = makeStore()

    const result = await store.dispatch(deleteProduct(id))

    expect(deleteProduct.fulfilled.match(result)).toBe(true)
    expect(result.payload).toBe(id)
  })
})

describe('deleteProduct thunk errors', () => {
  it('rejects deleteProduct with the ApiError on 500', async () => {
    const id = crypto.randomUUID()
    server.use(
      http.delete(productUrl(id), () => HttpResponse.json({ detail: 'boom' }, { status: 500 })),
    )
    const store = makeStore()

    const result = await store.dispatch(deleteProduct(id))

    expect(deleteProduct.rejected.match(result)).toBe(true)
    expect(result.payload).toMatchObject({ status: 500 })
  })
})

describe('refillPageAfterDelete thunk', () => {
  /** A store showing `page` with `rows` products out of `count`, and the pages it requests. */
  function setup(page: number, count: number, rows: number) {
    const pages: string[] = []
    server.use(
      http.get(productsUrl, ({ request }) => {
        pages.push(new URL(request.url).searchParams.get('page')!)
        return HttpResponse.json(buildProductsPage([buildProduct()], { count }))
      }),
    )
    const items = Array.from({ length: rows }, () => buildProduct())
    const store = makeStore({
      products: { items, page, count, status: 'succeeded', error: null },
    })
    return { store, pages }
  }

  it('refillPageAfterDelete fetches the current page when products follow it', async () => {
    const { store, pages } = setup(1, 24, 9)

    await store.dispatch(refillPageAfterDelete())

    expect(pages).toEqual(['1'])
  })

  it('refillPageAfterDelete does nothing on the last page', async () => {
    const { store, pages } = setup(3, 24, 4)

    await store.dispatch(refillPageAfterDelete())

    expect(pages).toEqual([])
  })

  it('refillPageAfterDelete fetches the previous page when the page is empty', async () => {
    const { store, pages } = setup(3, 20, 0)

    await store.dispatch(refillPageAfterDelete())

    expect(pages).toEqual(['2'])
    expect(store.getState().products.page).toBe(2)
  })

  it('refillPageAfterDelete does nothing when the catalog is empty', async () => {
    const { store, pages } = setup(1, 0, 0)

    await store.dispatch(refillPageAfterDelete())

    expect(pages).toEqual([])
  })
})
