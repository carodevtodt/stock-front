import { LIST_PRODUCTS_ERROR } from '../../constants'
import { productsSlice } from '../../store/productsSlice'
import { createProduct, fetchProducts } from '../../store/productsThunks'
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
