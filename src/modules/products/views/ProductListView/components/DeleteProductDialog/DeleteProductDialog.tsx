import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { buttonVariants } from '@/shared/components/ui/button'
import { DELETE_PRODUCT_DIALOG as TEXT } from '../../../../constants'
import type { Product } from '../../../../types/product'
import { useDeleteProductDialog } from './useDeleteProductDialog'

interface Props {
  product: Product | null
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteProductDialog({ product, onOpenChange, onDeleted }: Props) {
  const { isDeleting, confirm, handleOpenChange } = useDeleteProductDialog({
    product,
    onOpenChange,
    onDeleted,
  })

  return (
    <AlertDialog open={product !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{TEXT.title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p>{TEXT.body(product?.name ?? '')}</p>
              <p>{TEXT.warning}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{TEXT.cancel}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            disabled={isDeleting}
            onClick={(event) => {
              // Radix closes the dialog on click; keep it open until the backend answers.
              event.preventDefault()
              confirm()
            }}
          >
            {isDeleting ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                {TEXT.deleting}
              </>
            ) : (
              TEXT.confirm
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
