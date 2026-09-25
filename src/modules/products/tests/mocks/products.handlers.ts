import { http, HttpResponse } from 'msw'
import { env } from '@/shared/config/env'
import type { CreateProductInput, UpdateProductInput } from '../../types/product'
import { buildProduct, buildProductsPage } from './product.factory'

export const productsUrl = `${env.apiUrl}/products/`
export const productUrl = (id: string) => `${productsUrl}${id}/`

export const productsHandlers = [
  http.get(productsUrl, () => HttpResponse.json(buildProductsPage([]))),
  http.post(productsUrl, async ({ request }) => {
    const body = (await request.json()) as CreateProductInput
    return HttpResponse.json(buildProduct(body), { status: 201 })
  }),
  http.get(`${productsUrl}:id/`, ({ params }) =>
    HttpResponse.json(buildProduct({ id: params.id as string })),
  ),
  http.put(`${productsUrl}:id/`, async ({ params, request }) => {
    const body = (await request.json()) as UpdateProductInput
    return HttpResponse.json(buildProduct({ id: params.id as string, ...body }))
  }),
]
