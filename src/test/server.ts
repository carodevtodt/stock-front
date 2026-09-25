import type { RequestHandler } from 'msw'
import { setupServer } from 'msw/node'

// Module handlers (e.g. products.handlers.ts) are added here as modules are built.
export const handlers: RequestHandler[] = []

export const server = setupServer(...handlers)
