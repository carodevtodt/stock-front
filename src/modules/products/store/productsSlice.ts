import { createSlice } from '@reduxjs/toolkit'
import { LIST_PRODUCTS_ERROR, PAGE_SIZE } from '../constants'
import type { Product } from '../types/product'
import { createProduct, deleteProduct, fetchProducts, updateProduct } from './productsThunks'

export interface ProductsState {
  items: Product[]
  page: number
  count: number
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

/** Drop a product that no longer exists from the current page. */
function removeItem(state: ProductsState, id: string) {
  const index = state.items.findIndex((item) => item.id === id)
  if (index === -1) return
  state.items.splice(index, 1)
  state.count -= 1
}

const initialState: ProductsState = {
  items: [],
  page: 1,
  count: 0,
  status: 'idle',
  error: null,
}

export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state, action) => {
        state.status = 'loading'
        state.error = null
        state.page = action.meta.arg
      })
      // A response for a page the user already left (e.g. a quick second click) is ignored.
      .addCase(fetchProducts.fulfilled, (state, action) => {
        if (action.meta.arg !== state.page) return
        state.items = action.payload.results
        state.count = action.payload.count
        state.status = 'succeeded'
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        if (action.meta.arg !== state.page) return
        state.status = 'failed'
        state.error = LIST_PRODUCTS_ERROR
      })
      // Newest first: on page 1 the created product goes on top at once. On other pages the view
      // reloads page 1 instead (see useProductListView).
      .addCase(createProduct.fulfilled, (state, action) => {
        if (state.page !== 1) return
        state.items = [action.payload, ...state.items].slice(0, PAGE_SIZE)
        state.count += 1
        state.status = 'succeeded'
      })
      // Edits keep created_at, so the product stays in its place in the newest-first list.
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id)
        if (index !== -1) state.items[index] = action.payload
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        removeItem(state, action.payload)
      })
      // 404: another user already deleted it, so it's gone from the page too.
      .addCase(deleteProduct.rejected, (state, action) => {
        if (action.payload?.status === 404) removeItem(state, action.meta.arg)
      })
  },
})
