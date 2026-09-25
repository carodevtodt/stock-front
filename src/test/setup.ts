import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toast } from 'sonner'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  // Sonner keeps toasts in module state; dismiss them so they don't leak into the next test.
  toast.dismiss()
  cleanup()
})
afterAll(() => server.close())
