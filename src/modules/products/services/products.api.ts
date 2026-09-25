import { http } from '@/shared/lib/http'
import type { CreateProductInput, Paginated, Product } from '../types/product'

export const listProducts = (page: number) =>
  http.get<Paginated<Product>>(`/products/?page=${page}`)

export const createProduct = (input: CreateProductInput) =>
  http.post<Product>('/products/', input)
