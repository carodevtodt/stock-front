import { http, HttpResponse } from 'msw'
import { env } from '@/shared/config/env'
import type { CreateProductInput } from '../../types/product'
import { buildProduct, buildProductsPage } from './product.factory'

export const productsUrl = `${env.apiUrl}/products/`

export const productsHandlers = [
  http.get(productsUrl, () => HttpResponse.json(buildProductsPage([]))),
  http.post(productsUrl, async ({ request }) => {
    const body = (await request.json()) as CreateProductInput
    return HttpResponse.json(buildProduct(body), { status: 201 })
  }),
]
