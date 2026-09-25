import { makeStore } from '@/app/store'
import { selectTotalPages } from '../../store/productsSelectors'

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
