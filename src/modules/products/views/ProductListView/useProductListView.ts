import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  selectProducts,
  selectProductsCount,
  selectProductsError,
  selectProductsPage,
  selectProductsStatus,
  selectTotalPages,
} from '../../store/productsSelectors'
import { fetchProducts } from '../../store/productsThunks'

export function useProductListView() {
  const dispatch = useAppDispatch()
  const products = useAppSelector(selectProducts)
  const status = useAppSelector(selectProductsStatus)
  const count = useAppSelector(selectProductsCount)
  const page = useAppSelector(selectProductsPage)
  const totalPages = useAppSelector(selectTotalPages)
  const error = useAppSelector(selectProductsError)
  const [isFormOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    dispatch(fetchProducts(1))
  }, [dispatch])

  return {
    products,
    status,
    count,
    page,
    totalPages,
    error,
    goToPage: (target: number) => dispatch(fetchProducts(target)),
    // Page 1 already shows the created product (see productsSlice); other pages reload page 1.
    onCreated: () => {
      if (page !== 1) dispatch(fetchProducts(1))
    },
    retry: () => dispatch(fetchProducts(page)),
    form: {
      isOpen: isFormOpen,
      open: () => setFormOpen(true),
      onOpenChange: setFormOpen,
    },
    edit: {
      productId: editingId,
      open: (id: string) => setEditingId(id),
      onOpenChange: (open: boolean) => {
        if (!open) setEditingId(null)
      },
      onNotFound: () => dispatch(fetchProducts(page)),
    },
  }
}
