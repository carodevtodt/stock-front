import {
  PRODUCT_MESSAGES as M,
  productSchema,
  toProductInput,
  toProductFormValues,
} from '../../validation/productSchema'
import type { ProductFormValues } from '../../types/product'
import { buildProduct } from '../mocks/product.factory'

const valid: ProductFormValues = {
  name: 'Keyboard',
  description: 'Mechanical keyboard',
  price: '49.99',
  stock: '10',
}

/** First error message per field, e.g. `{ price: M.priceNotPositive }`. */
function errorsFor(overrides: Partial<ProductFormValues>) {
  const result = productSchema.safeParse({ ...valid, ...overrides })
  const errors: Record<string, string> = {}
  for (const issue of result.error?.issues ?? []) {
    const field = String(issue.path[0])
    errors[field] ??= issue.message
  }
  return errors
}

describe('productSchema', () => {
  it('accepts a valid product', () => {
    expect(productSchema.safeParse(valid).success).toBe(true)
  })

  it('requires name, price and stock', () => {
    expect(errorsFor({ name: '', description: '', price: '', stock: '' })).toEqual({
      name: M.nameRequired,
      price: M.priceRequired,
      stock: M.stockRequired,
    })
  })

  it('rejects a name with only spaces', () => {
    expect(errorsFor({ name: '   ' })).toEqual({ name: M.nameRequired })
  })

  it('rejects a name longer than 255 characters', () => {
    expect(errorsFor({ name: 'a'.repeat(256) })).toEqual({
      name: M.nameTooLong,
    })
    expect(errorsFor({ name: 'a'.repeat(255) })).toEqual({})
  })

  it('rejects a non-numeric price', () => {
    expect(errorsFor({ price: 'abc' })).toEqual({ price: M.priceNotNumber })
  })

  it('rejects a price of 0 or less', () => {
    expect(errorsFor({ price: '0' })).toEqual({ price: M.priceNotPositive })
    expect(errorsFor({ price: '-1' })).toEqual({ price: M.priceNotPositive })
  })

  it('rejects a price with more than 2 decimals', () => {
    expect(errorsFor({ price: '9.999' })).toEqual({ price: M.priceTooManyDecimals })
  })

  it('rejects a price above 99999999.99', () => {
    expect(errorsFor({ price: '100000000' })).toEqual({
      price: M.priceTooLarge,
    })
    expect(errorsFor({ price: '99999999.99' })).toEqual({})
  })

  it('accepts prices with up to 2 decimals', () => {
    for (const price of ['0.01', '49.9', '49.99']) {
      expect(errorsFor({ price })).toEqual({})
    }
  })

  it('rejects negative and fractional stock', () => {
    expect(errorsFor({ stock: '-1' })).toEqual({ stock: M.stockNegative })
    expect(errorsFor({ stock: '1.5' })).toEqual({ stock: M.stockNotInteger })
    expect(errorsFor({ stock: 'abc' })).toEqual({ stock: M.stockNotInteger })
    expect(errorsFor({ stock: '0' })).toEqual({})
  })
})

describe('toProductInput', () => {
  it('maps form values to the create input', () => {
    expect(toProductInput({ ...valid, name: ' Keyboard ' })).toEqual({
      name: 'Keyboard',
      description: 'Mechanical keyboard',
      price: '49.99',
      stock: 10,
    })
  })

  it('maps an empty description to null', () => {
    expect(toProductInput({ ...valid, description: '' }).description).toBeNull()
    expect(toProductInput({ ...valid, description: '   ' }).description).toBeNull()
  })
})

describe('toProductFormValues', () => {
  it('converts a product into form values', () => {
    expect(toProductFormValues(buildProduct({ price: '49.99', stock: 10 }))).toEqual({
      name: 'Keyboard',
      description: 'Mechanical keyboard',
      price: '49.99',
      stock: '10',
    })
  })

  it('converts a null description into an empty string', () => {
    expect(toProductFormValues(buildProduct({ description: null })).description).toBe('')
  })
})
