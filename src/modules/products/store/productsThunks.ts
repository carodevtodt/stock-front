import { createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store'
import type { ApiError } from '@/shared/lib/http'
import * as productsApi from '../services/products.api'
import { selectHasProductsAfterPage } from './productsSelectors'
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

/** Resolves with the deleted product's id. */
export const deleteProduct = createAsyncThunk<string, string, { rejectValue: ApiError }>(
  'products/delete',
  async (id, { rejectWithValue }) => {
    try {
      await productsApi.deleteProduct(id)
      return id
    } catch (error) {
      return rejectWithValue(error as ApiError)
    }
  },
)

/**
 * After a row was removed, keep the current page consistent with the backend's pages:
 * an emptied page after page 1 shows the previous page, a page followed by more products is
 * requested again (the next product moves up), and anything else needs no request.
 */
export const refillPageAfterDelete = createAsyncThunk<void, void, { state: RootState }>(
  'products/refillAfterDelete',
  async (_, { dispatch, getState }) => {
    const state = getState()
    const { items, page } = state.products
    if (items.length === 0 && page > 1) await dispatch(fetchProducts(page - 1))
    else if (selectHasProductsAfterPage(state)) await dispatch(fetchProducts(page))
  },
)
