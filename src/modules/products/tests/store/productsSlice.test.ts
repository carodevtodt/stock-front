import { productsSlice } from '../../store/productsSlice'
import { createProduct } from '../../store/productsThunks'
import { buildCreateProductInput, buildProduct } from '../mocks/product.factory'

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
})
