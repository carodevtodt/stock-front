import type { RootState } from '@/app/store'
import { PAGE_SIZE } from '../constants'

export const selectProducts = (state: RootState) => state.products.items
export const selectProductsPage = (state: RootState) => state.products.page
export const selectProductsCount = (state: RootState) => state.products.count
export const selectProductsStatus = (state: RootState) => state.products.status
export const selectProductsError = (state: RootState) => state.products.error
export const selectTotalPages = (state: RootState) =>
  Math.max(1, Math.ceil(state.products.count / PAGE_SIZE))
/** More products exist after the rows the current page shows. */
export const selectHasProductsAfterPage = (state: RootState) =>
  state.products.count > (state.products.page - 1) * PAGE_SIZE + state.products.items.length
