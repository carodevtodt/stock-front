import { http } from '@/shared/lib/http'
import type { CreateProductInput, Product } from '../types/product'

export const createProduct = (input: CreateProductInput) =>
  http.post<Product>('/products/', input)
