import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Textarea } from '@/shared/components/ui/textarea'
import { useProductFormModal } from './useProductFormModal'

interface Props {
  open: boolean
  /** Edit this product (preloaded by id). Without it the modal creates a new product. */
  productId?: string | null
  onOpenChange: (open: boolean) => void
  /** Called after a product was created (toast shown, modal closed). */
  onCreated?: () => void
  /** Called when the edited product no longer exists (toast shown, modal closed). */
  onNotFound?: () => void
}

export function ProductFormModal({ open, productId, onOpenChange, onCreated, onNotFound }: Props) {
  const { form, onSubmit, handleOpenChange, isSaving, isLoading, title } = useProductFormModal({
    productId,
    onOpenChange,
    onCreated,
    onNotFound,
  })
  // While the edited product loads, each input is replaced by a skeleton (labels stay).
  const control = (input: ReactNode) =>
    isLoading ? (
      <Skeleton className="h-9 w-full" data-testid="product-form-skeleton" />
    ) : (
      <FormControl>{input}</FormControl>
    )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Fill in the product details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  {control(<Input {...field} />)}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  {control(<Textarea {...field} />)}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price *</FormLabel>
                    {control(<Input inputMode="decimal" placeholder="0.00" {...field} />)}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock *</FormLabel>
                    {control(<Input inputMode="numeric" placeholder="0" {...field} />)}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || isLoading}>
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
