import { env } from '@/shared/config/env'
import { PAGE_SIZE } from '../../constants'
import type { CreateProductInput, Paginated, Product } from '../../types/product'

export function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: crypto.randomUUID(),
    name: 'Keyboard',
    description: 'Mechanical keyboard',
    price: '49.99',
    stock: 10,
    created_at: '2026-09-24T10:00:00Z',
    updated_at: '2026-09-24T10:00:00Z',
    ...overrides,
  }
}

export function buildCreateProductInput(
  overrides: Partial<CreateProductInput> = {},
): CreateProductInput {
  return {
    name: 'Keyboard',
    description: 'Mechanical keyboard',
    price: '49.99',
    stock: 10,
    ...overrides,
  }
}


/** Build a `GET /products/` page body. `count` defaults to the number of products given. */
export function buildProductsPage(
  products: Product[],
  { count = products.length, page = 1 }: { count?: number; page?: number } = {},
): Paginated<Product> {
  const lastPage = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const pageUrl = (n: number) => `${env.apiUrl}/products/?page=${n}`
  return {
    count,
    next: page < lastPage ? pageUrl(page + 1) : null,
    previous: page > 1 ? pageUrl(page - 1) : null,
    results: products,
  }
}
