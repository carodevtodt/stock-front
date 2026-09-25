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

/** Body of `POST /api/products/`. */
export interface CreateProductInput {
  name: string
  description: string | null
  price: string
  stock: number
}

/** Raw form values: every input yields a string. */
export interface ProductFormValues {
  name: string
  description: string
  price: string
  stock: string
}
