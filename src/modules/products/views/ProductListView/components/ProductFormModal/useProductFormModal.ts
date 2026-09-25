import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { useAppDispatch } from '@/app/hooks'
import type { ApiError } from '@/shared/lib/http'
import { createProduct } from '../../../../store/productsThunks'
import type { ProductFormValues } from '../../../../types/product'
import { productSchema, toCreateProductInput } from '../../../../validation/productSchema'

/** Feedback messages from docs/design-system.md. */
export const CREATE_PRODUCT_TOASTS = {
  success: 'Product created.',
  error: 'Could not create product.',
} as const

const EMPTY_VALUES: ProductFormValues = { name: '', description: '', price: '', stock: '' }
const FORM_FIELDS = Object.keys(EMPTY_VALUES) as (keyof ProductFormValues)[]

/** Show a 400's first message under each form field it names. Returns false if none matched. */
function applyServerFieldErrors(form: UseFormReturn<ProductFormValues>, error: ApiError) {
  if (error.status !== 400) return false
  const fields = FORM_FIELDS.filter((field) => error.fieldErrors?.[field]?.length)
  for (const field of fields) form.setError(field, { message: error.fieldErrors[field][0] })
  return fields.length > 0
}

interface Options {
  onOpenChange: (open: boolean) => void
}

export function useProductFormModal({ onOpenChange }: Options) {
  const dispatch = useAppDispatch()
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_VALUES,
  })

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset(EMPTY_VALUES)
    onOpenChange(open)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await dispatch(createProduct(toCreateProductInput(values))).unwrap()
    } catch (error) {
      if (!applyServerFieldErrors(form, error as ApiError)) toast.error(CREATE_PRODUCT_TOASTS.error)
      return
    }
    toast.success(CREATE_PRODUCT_TOASTS.success)
    handleOpenChange(false)
  })

  return { form, onSubmit, handleOpenChange, isSaving: form.formState.isSubmitting }
}
