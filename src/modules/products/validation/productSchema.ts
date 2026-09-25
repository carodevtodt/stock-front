import { z } from 'zod'
import type { Product, ProductFormValues, ProductInput } from '../types/product'

/** Client-side field messages (docs: product-ui spec). */
export const PRODUCT_MESSAGES = {
  nameRequired: 'Name is required.',
  nameTooLong: 'Name must be at most 255 characters.',
  priceRequired: 'Price is required.',
  priceNotNumber: 'Price must be a number.',
  priceNotPositive: 'Price must be greater than 0.',
  priceTooManyDecimals: 'Price must have at most 2 decimals.',
  priceTooLarge: 'Price must be at most 99999999.99.',
  stockRequired: 'Stock is required.',
  stockNotInteger: 'Stock must be a whole number.',
  stockNegative: 'Stock must be 0 or greater.',
} as const

const NUMBER = /^-?\d+(\.\d+)?$/
const MAX_TWO_DECIMALS = /^-?\d+(\.\d{1,2})?$/
const INTEGER = /^-?\d+$/
const MAX_PRICE = 99999999.99

const price = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message })
    if (!value) return fail(PRODUCT_MESSAGES.priceRequired)
    if (!NUMBER.test(value)) return fail(PRODUCT_MESSAGES.priceNotNumber)
    if (Number(value) <= 0) return fail(PRODUCT_MESSAGES.priceNotPositive)
    if (!MAX_TWO_DECIMALS.test(value)) return fail(PRODUCT_MESSAGES.priceTooManyDecimals)
    if (Number(value) > MAX_PRICE) return fail(PRODUCT_MESSAGES.priceTooLarge)
  })

const stock = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message })
    if (!value) return fail(PRODUCT_MESSAGES.stockRequired)
    if (!INTEGER.test(value)) return fail(PRODUCT_MESSAGES.stockNotInteger)
    if (Number(value) < 0) return fail(PRODUCT_MESSAGES.stockNegative)
  })

/** Validates the raw (string) form values; see docs/features/01-create-product.md. */
export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, PRODUCT_MESSAGES.nameRequired)
    .max(255, PRODUCT_MESSAGES.nameTooLong),
  description: z.string(),
  price,
  stock,
})

/** Convert valid form values into the API body (create and update). */
export function toProductInput(values: ProductFormValues): ProductInput {
  const description = values.description.trim()
  return {
    name: values.name.trim(),
    description: description || null,
    price: values.price.trim(),
    stock: Number.parseInt(values.stock, 10),
  }
}

/** Convert a product from the API into form values (the reverse of the input conversion). */
export function toProductFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    description: product.description ?? '',
    price: product.price,
    stock: String(product.stock),
  }
}
