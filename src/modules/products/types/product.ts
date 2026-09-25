/** Product as returned by the API (`price` is a 2-decimal string). */
export interface Product {
  id: string
  name: string
  description: string | null
  price: string
  stock: number
  created_at: string
  updated_at: string
}

/** Body of `POST /api/products/` and `PUT /api/products/{id}/` (every field is sent). */
export interface ProductInput {
  name: string
  description: string | null
  price: string
  stock: number
}

export type CreateProductInput = ProductInput
export type UpdateProductInput = ProductInput

/** Raw form values: every input yields a string. */
export interface ProductFormValues {
  name: string
  description: string
  price: string
  stock: string
}

/** Page of a paginated list endpoint (`GET /api/products/?page=N`). */
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
