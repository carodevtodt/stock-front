import { http, HttpResponse } from 'msw'
import { env } from '@/shared/config/env'
import type { CreateProductInput } from '../../types/product'
import { buildProduct } from './product.factory'

export const productsUrl = `${env.apiUrl}/products/`

export const productsHandlers = [
  http.post(productsUrl, async ({ request }) => {
    const body = (await request.json()) as CreateProductInput
    return HttpResponse.json(buildProduct(body), { status: 201 })
  }),
]
