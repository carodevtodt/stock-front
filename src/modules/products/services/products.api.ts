import { http } from '@/shared/lib/http'
import type {
  CreateProductInput,
  Paginated,
  Product,
  UpdateProductInput,
} from '../types/product'

export const listProducts = (page: number) =>
  http.get<Paginated<Product>>(`/products/?page=${page}`)

export const createProduct = (input: CreateProductInput) =>
  http.post<Product>('/products/', input)

export const getProduct = (id: string) => http.get<Product>(`/products/${id}/`)

export const updateProduct = (id: string, input: UpdateProductInput) =>
  http.put<Product>(`/products/${id}/`, input)

export const deleteProduct = (id: string) => http.delete<void>(`/products/${id}/`)
