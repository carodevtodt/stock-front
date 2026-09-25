import type { CreateProductInput, Product } from '../../types/product'

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
