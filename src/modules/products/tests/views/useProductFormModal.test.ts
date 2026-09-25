import { act, renderHook } from '@testing-library/react'
import { createElement, type ComponentProps, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '@/app/store'
import { useProductFormModal } from '../../views/ProductListView/components/ProductFormModal/useProductFormModal'

function renderFormHook() {
  const store = makeStore()
  const onOpenChange = vi.fn()
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(Provider, { store } as ComponentProps<typeof Provider>, children)
  const hook = renderHook(() => useProductFormModal({ onOpenChange }), { wrapper })
  return { ...hook, onOpenChange, store }
}

describe('useProductFormModal', () => {
  it('closes and resets the form after a successful save', async () => {
    const { result, onOpenChange, store } = renderFormHook()
    act(() => {
      result.current.form.setValue('name', 'Keyboard')
      result.current.form.setValue('price', '49.99')
      result.current.form.setValue('stock', '10')
    })

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
})
