import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ComponentProps, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '@/app/store'
import { server } from '@/test/server'
import { useProductListView } from '../../views/ProductListView/useProductListView'
import { buildProduct, buildProductsPage } from '../mocks/product.factory'
import { productsUrl } from '../mocks/products.handlers'

function renderListHook() {
  const store = makeStore()
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(Provider, { store } as ComponentProps<typeof Provider>, children)
  const hook = renderHook(() => useProductListView(), { wrapper })
  return { ...hook, store }
}

describe('useProductListView', () => {
  it('retry fetches the current page again', async () => {
    const pages: (string | null)[] = []
    server.use(
      http.get(productsUrl, ({ request }) => {
        pages.push(new URL(request.url).searchParams.get('page'))
        if (pages.length === 1) return HttpResponse.json({}, { status: 500 })
        return HttpResponse.json(buildProductsPage([buildProduct()]))
      }),
    )
    const { result } = renderListHook()
    await waitFor(() => expect(result.current.status).toBe('failed'))

    act(() => result.current.retry())

    await waitFor(() => expect(result.current.status).toBe('succeeded'))
    expect(pages).toEqual(['1', '1'])
  })
})
