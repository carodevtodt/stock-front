import { LIST_PRODUCTS_ERROR } from '../../constants'
import { productsSlice } from '../../store/productsSlice'
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
} from '../../store/productsThunks'
import { buildCreateProductInput, buildProduct, buildProductsPage } from '../mocks/product.factory'

const reducer = productsSlice.reducer

describe('productsSlice', () => {
  it('starts with an empty idle list', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual({
      items: [],
      page: 1,
      count: 0,
      status: 'idle',
      error: null,
    })
  })

  it('adds the created product to the start of items and increments count', () => {
    const existing = buildProduct({ name: 'Mouse' })
    const created = buildProduct({ name: 'Keyboard' })
    const state = { ...reducer(undefined, { type: '@@INIT' }), items: [existing], count: 1 }

    const next = reducer(
      state,
      createProduct.fulfilled(created, 'request-id', buildCreateProductInput()),
    )

    expect(next.items).toEqual([created, existing])
    expect(next.count).toBe(2)
  })

  it('keeps at most 10 items when a product is created on page 1', () => {
    const existing = Array.from({ length: 10 }, (_, i) => buildProduct({ name: `P1-${i}` }))
    const created = buildProduct({ name: 'Keyboard' })
    const state = { ...reducer(undefined, { type: '@@INIT' }), items: existing, count: 25 }

    const next = reducer(
      state,
      createProduct.fulfilled(created, 'request-id', buildCreateProductInput()),
    )

    expect(next.items[0]).toEqual(created)
    expect(next.items).toHaveLength(10)
    expect(next.items.at(-1)).toEqual(existing[8])
    expect(next.count).toBe(26)
    expect(next.status).toBe('succeeded')
  })

  it('does not change items when a product is created on another page', () => {
    const existing = Array.from({ length: 10 }, (_, i) => buildProduct({ name: `P2-${i}` }))
    const state = { ...reducer(undefined, { type: '@@INIT' }), items: existing, page: 2, count: 25 }

    const next = reducer(
      state,
      createProduct.fulfilled(buildProduct(), 'request-id', buildCreateProductInput()),
    )

    expect(next.items).toEqual(existing)
  })

  it('sets loading and the requested page on fetch pending', () => {
    const state = { ...reducer(undefined, { type: '@@INIT' }), status: 'failed' as const, error: 'x' }

    const next = reducer(state, fetchProducts.pending('request-id', 3))

    expect(next).toMatchObject({ status: 'loading', error: null, page: 3 })
  })

  it('sets failed and the load error message on fetch rejected', () => {
    const state = reducer(undefined, fetchProducts.pending('request-id', 1))
    const apiError = { status: 500, message: 'boom', fieldErrors: {} }

    const next = reducer(state, fetchProducts.rejected(null, 'request-id', 1, apiError))

    expect(next).toMatchObject({ status: 'failed', error: LIST_PRODUCTS_ERROR })
  })

  it('ignores a fetch response for a page that is no longer current', () => {
    let state = reducer(undefined, fetchProducts.pending('request-1', 1))
    state = reducer(state, fetchProducts.pending('request-2', 2))

    const next = reducer(
      state,
      fetchProducts.fulfilled(buildProductsPage([buildProduct()], { count: 25 }), 'request-1', 1),
    )

    expect(next.items).toEqual([])
    expect(next.status).toBe('loading')
    expect(next.page).toBe(2)
  })

  it('stores the results and count on fetch fulfilled', () => {
    const products = Array.from({ length: 10 }, (_, i) => buildProduct({ name: `P2-${i}` }))
    const state = reducer(undefined, fetchProducts.pending('request-id', 2))

    const next = reducer(
      state,
      fetchProducts.fulfilled(buildProductsPage(products, { count: 25, page: 2 }), 'request-id', 2),
    )

    expect(next.items).toEqual(products)
    expect(next.count).toBe(25)
    expect(next.status).toBe('succeeded')
  })
})

describe('productsSlice updateProduct', () => {
  const loaded = (items: ReturnType<typeof buildProduct>[]) => ({
    ...reducer(undefined, { type: '@@INIT' }),
    items,
    page: 2,
    count: 25,
    status: 'succeeded' as const,
  })
  const updated = (product: ReturnType<typeof buildProduct>) =>
    updateProduct.fulfilled(product, 'request-id', {
      id: product.id,
      input: buildCreateProductInput(),
    })

  it('replaces the updated product in items on update fulfilled', () => {
    const [a, b, c] = ['A', 'B', 'C'].map((name) => buildProduct({ name }))

    const next = reducer(loaded([a, b, c]), updated({ ...b, name: 'B2' }))

    expect(next.items.map((p) => p.name)).toEqual(['A', 'B2', 'C'])
  })

  it('does not change page, count or status on update fulfilled', () => {
    const product = buildProduct()

    const next = reducer(loaded([product]), updated({ ...product, name: 'New name' }))

    expect(next).toMatchObject({ page: 2, count: 25, status: 'succeeded' })
  })

  it('leaves items alone when the updated product is not on the current page', () => {
    const state = loaded([buildProduct()])

    const next = reducer(state, updated(buildProduct()))

    expect(next.items).toBe(state.items)
  })

  it('does not change items on update rejected', () => {
    const state = loaded([buildProduct()])
    const error = { status: 500, message: 'boom', fieldErrors: {} }

    const next = reducer(
      state,
      updateProduct.rejected(null, 'request-id', { id: 'x', input: buildCreateProductInput() }, error),
    )

    expect(next).toEqual(state)
  })
})

describe('productsSlice deleteProduct', () => {
  const loaded = (items: ReturnType<typeof buildProduct>[]) => ({
    ...reducer(undefined, { type: '@@INIT' }),
    items,
    page: 2,
    count: 13,
    status: 'succeeded' as const,
  })
  const notFound = { status: 404, message: 'Product not found.', fieldErrors: {} }

  it('removes the item and lowers count on delete fulfilled', () => {
    const [a, b, c] = ['A', 'B', 'C'].map((name) => buildProduct({ name }))

    const next = reducer(loaded([a, b, c]), deleteProduct.fulfilled(b.id, 'request-id', b.id))

    expect(next.items).toEqual([a, c])
    expect(next).toMatchObject({ count: 12, page: 2, status: 'succeeded' })
  })

  it('removes the item on delete rejected with 404', () => {
    const [a, b, c] = ['A', 'B', 'C'].map((name) => buildProduct({ name }))

    const next = reducer(
      loaded([a, b, c]),
      deleteProduct.rejected(null, 'request-id', b.id, notFound),
    )

    expect(next.items).toEqual([a, c])
    expect(next.count).toBe(12)
  })

  it('leaves the state alone when the deleted id is not on the page', () => {
    const state = loaded([buildProduct()])
    const id = crypto.randomUUID()

    const next = reducer(state, deleteProduct.fulfilled(id, 'request-id', id))

    expect(next).toEqual(state)
  })
})

describe('productsSlice deleteProduct errors', () => {
  it('does not change the state on delete rejected with 500', () => {
    const product = buildProduct()
    const state = {
      ...reducer(undefined, { type: '@@INIT' }),
      items: [product],
      count: 1,
      status: 'succeeded' as const,
    }
    const error = { status: 500, message: 'boom', fieldErrors: {} }

    const next = reducer(state, deleteProduct.rejected(null, 'request-id', product.id, error))

    expect(next).toEqual(state)
  })
})
