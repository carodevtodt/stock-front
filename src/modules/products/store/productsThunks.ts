import { createAsyncThunk } from '@reduxjs/toolkit'
import type { ApiError } from '@/shared/lib/http'
import * as productsApi from '../services/products.api'
import type {
  CreateProductInput,
  Paginated,
  Product,
  UpdateProductInput,
} from '../types/product'

export const fetchProducts = createAsyncThunk<
  Paginated<Product>,
  number,
  { rejectValue: ApiError }
>('products/fetch', async (page, { rejectWithValue }) => {
  try {
    return await productsApi.listProducts(page)
  } catch (error) {
    return rejectWithValue(error as ApiError)
  }
})

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

export const fetchProduct = createAsyncThunk<Product, string, { rejectValue: ApiError }>(
  'products/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      return await productsApi.getProduct(id)
    } catch (error) {
      return rejectWithValue(error as ApiError)
    }
  },
)

export const updateProduct = createAsyncThunk<
  Product,
  { id: string; input: UpdateProductInput },
  { rejectValue: ApiError }
>('products/update', async ({ id, input }, { rejectWithValue }) => {
  try {
    return await productsApi.updateProduct(id, input)
  } catch (error) {
    return rejectWithValue(error as ApiError)
  }
})
