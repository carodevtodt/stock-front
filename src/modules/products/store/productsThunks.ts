import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ApiError } from '@/shared/lib/http'
import * as productsApi from '../services/products.api'
import type { CreateProductInput, Product } from '../types/product'

export const createProduct = createAsyncThunk<
  Product,
  CreateProductInput,
  { rejectValue: ApiError }
>('products/create', async (input, { rejectWithValue }) => {
  try {
    return await productsApi.createProduct(input)
  } catch (error) {
    return rejectWithValue(error as ApiError)
  }
})
