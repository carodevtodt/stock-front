import { makeStore } from '@/app/store'
import { selectHasProductsAfterPage, selectTotalPages } from '../../store/productsSelectors'
import { buildProduct } from '../mocks/product.factory'

function stateWithCount(count: number) {
  const store = makeStore()
  const state = store.getState()
  return { ...state, products: { ...state.products, count } }
}

describe('productsSelectors', () => {
  it('computes total pages from count', () => {
    expect(selectTotalPages(stateWithCount(0))).toBe(1)
    expect(selectTotalPages(stateWithCount(10))).toBe(1)
    expect(selectTotalPages(stateWithCount(11))).toBe(2)
    expect(selectTotalPages(stateWithCount(25))).toBe(3)
  })
})

describe('selectHasProductsAfterPage', () => {
  function stateWith(page: number, count: number, rows: number) {
    const state = makeStore().getState()
    const items = Array.from({ length: rows }, () => buildProduct())
    return { ...state, products: { ...state.products, page, count, items } }
  }

  it('selectHasProductsAfterPage is true when count exceeds the shown rows', () => {
    expect(selectHasProductsAfterPage(stateWith(1, 24, 9))).toBe(true)
  })

  it('selectHasProductsAfterPage is false on the last page', () => {
    expect(selectHasProductsAfterPage(stateWith(3, 24, 4))).toBe(false)
  })
})
