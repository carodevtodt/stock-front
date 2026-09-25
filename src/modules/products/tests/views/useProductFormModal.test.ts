import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement, type ComponentProps, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '@/app/store'
import { server } from '@/test/server'
import { useProductFormModal } from '../../views/ProductListView/components/ProductFormModal/useProductFormModal'
import { buildProduct } from '../mocks/product.factory'
import { productUrl, productsUrl } from '../mocks/products.handlers'

function renderFormHook() {
  const store = makeStore()
  const onOpenChange = vi.fn()
  const onCreated = vi.fn()
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(Provider, { store } as ComponentProps<typeof Provider>, children)
  const hook = renderHook(() => useProductFormModal({ onOpenChange, onCreated }), { wrapper })
  return { ...hook, onOpenChange, onCreated, store }
}

function fillValidProduct(result: ReturnType<typeof renderFormHook>['result']) {
  act(() => {
    result.current.form.setValue('name', 'Keyboard')
    result.current.form.setValue('price', '49.99')
    result.current.form.setValue('stock', '10')
  })
}

describe('useProductFormModal', () => {
  it('closes and resets the form after a successful save', async () => {
    const { result, onOpenChange, store } = renderFormHook()
    fillValidProduct(result)

    await act(() => result.current.onSubmit())

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(result.current.form.getValues()).toEqual({
      name: '',
      description: '',
      price: '',
      stock: '',
    })
    expect(store.getState().products.items).toHaveLength(1)
  })

  it('calls onCreated after a successful save', async () => {
    const { result, onCreated } = renderFormHook()
    fillValidProduct(result)

    await act(() => result.current.onSubmit())

    expect(onCreated).toHaveBeenCalledTimes(1)
  })

  it('does not call onCreated when the save fails', async () => {
    server.use(http.post(productsUrl, () => HttpResponse.json({}, { status: 500 })))
    const { result, onCreated } = renderFormHook()
    fillValidProduct(result)

    await act(() => result.current.onSubmit())

    expect(onCreated).not.toHaveBeenCalled()
  })
})

describe('useProductFormModal edit mode', () => {
  it('ignores a product response that arrives after the form was closed', async () => {
    const first = buildProduct({ name: 'First' })
    const second = buildProduct({ name: 'Second' })
    let answerFirst: () => void = () => {}
    const firstAnswered = new Promise<void>((resolve) => (answerFirst = resolve))
    server.use(
      http.get(productUrl(first.id), async () => {
        await firstAnswered
        return HttpResponse.json(first)
      }),
      http.get(productUrl(second.id), () => HttpResponse.json(second)),
    )
    const store = makeStore()
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(Provider, { store } as ComponentProps<typeof Provider>, children)
    const { result, rerender } = renderHook(
      ({ productId }: { productId: string }) =>
        useProductFormModal({ productId, onOpenChange: vi.fn() }),
      { wrapper, initialProps: { productId: first.id } },
    )

    rerender({ productId: second.id })
    await waitFor(() => expect(result.current.form.getValues('name')).toBe('Second'))
    answerFirst()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(result.current.form.getValues('name')).toBe('Second')
  })
})
