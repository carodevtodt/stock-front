import { createSlice } from '@reduxjs/toolkit'
import type { Product } from '../types/product'
import { createProduct } from './productsThunks'

export interface ProductsState {
  items: Product[]
  page: number
  count: number
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
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
    builder.addCase(createProduct.fulfilled, (state, action) => {
      state.items.unshift(action.payload)
      state.count += 1
    })
  },
})
