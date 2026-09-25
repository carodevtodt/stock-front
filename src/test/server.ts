import type { RequestHandler } from 'msw'
import { setupServer } from 'msw/node'
import { productsHandlers } from '@/modules/products/tests/mocks/products.handlers'

// Module handlers (e.g. products.handlers.ts) are added here as modules are built.
export const handlers: RequestHandler[] = [...productsHandlers]

export const server = setupServer(...handlers)
