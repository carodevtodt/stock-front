import { useState } from 'react'
import { toast } from 'sonner'
import { useAppDispatch } from '@/app/hooks'
import { deleteProduct } from '../../../../store/productsThunks'
import type { Product } from '../../../../types/product'

/** Feedback messages from docs/design-system.md. */
export const DELETE_PRODUCT_TOASTS = {
  success: 'Product deleted.',
  error: 'Could not delete product.',
  notFound: 'Product no longer exists.',
} as const

interface Options {
  /** The product to delete; the dialog is open while it is set. */
  product: Product | null
  onOpenChange: (open: boolean) => void
  /** Called after the product was removed from the list (toast shown, dialog closed). */
  onDeleted?: () => void
}

export function useDeleteProductDialog({ product, onOpenChange, onDeleted }: Options) {
  const dispatch = useAppDispatch()
  const [isDeleting, setDeleting] = useState(false)

  // Escape can't close the dialog while the request is in flight.
  const handleOpenChange = (open: boolean) => {
    if (!open && isDeleting) return
    onOpenChange(open)
  }

  const confirm = async () => {
    if (!product) return
    setDeleting(true)
    // A rejected thunk resolves (it doesn't throw), so this is the only place to reset.
    const result = await dispatch(deleteProduct(product.id))
    setDeleting(false)

    const isGone = deleteProduct.fulfilled.match(result) || result.payload?.status === 404
    if (!isGone) {
      toast.error(DELETE_PRODUCT_TOASTS.error) // the dialog stays open so the user can retry
      return
    }
    if (deleteProduct.fulfilled.match(result)) toast.success(DELETE_PRODUCT_TOASTS.success)
    else toast.error(DELETE_PRODUCT_TOASTS.notFound)
    // The slice already removed the row: close and let the list refill its page.
    onOpenChange(false)
    onDeleted?.()
  }

  return { isDeleting, confirm, handleOpenChange }
}
