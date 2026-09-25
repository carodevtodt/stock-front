import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { useAppDispatch } from '@/app/hooks'
import type { ApiError } from '@/shared/lib/http'
import { createProduct, fetchProduct, updateProduct } from '../../../../store/productsThunks'
import type { ProductFormValues } from '../../../../types/product'
import {
  productSchema,
  toProductFormValues,
  toProductInput,
} from '../../../../validation/productSchema'

/** Feedback messages from docs/design-system.md. */
export const CREATE_PRODUCT_TOASTS = {
  success: 'Product created.',
  error: 'Could not create product.',
} as const

export const UPDATE_PRODUCT_TOASTS = {
  success: 'Product updated.',
  error: 'Could not update product.',
  notFound: 'Product not found.',
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
  /** Edit this product (preloaded by id). Without it the form creates a new product. */
  productId?: string | null
  onOpenChange: (open: boolean) => void
  /** Called after a product was created (toast shown, modal closed). */
  onCreated?: () => void
  /** Called when the edited product no longer exists (toast shown, modal closed). */
  onNotFound?: () => void
}

export function useProductFormModal({ productId, onOpenChange, onCreated, onNotFound }: Options) {
  const dispatch = useAppDispatch()
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_VALUES,
  })
  // Id of the product whose data the form holds. The form is loading until it matches productId.
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const isLoading = Boolean(productId) && loadedId !== productId

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset(EMPTY_VALUES)
      setLoadedId(null)
    }
    onOpenChange(open)
  }

  /** The edited product no longer exists (404 on load or save): tell the user and close. */
  const closeAsNotFound = () => {
    toast.error(UPDATE_PRODUCT_TOASTS.notFound)
    handleOpenChange(false)
    onNotFound?.()
  }

  // Preload the edited product. A response for a product that is no longer open is ignored.
  useEffect(() => {
    if (!productId) return
    let ignore = false
    dispatch(fetchProduct(productId))
      .unwrap()
      .then((product) => {
        if (ignore) return
        form.reset(toProductFormValues(product))
        setLoadedId(product.id)
      })
      .catch((error: ApiError) => {
        if (ignore) return
        if (error.status === 404) return closeAsNotFound()
        // Nothing to edit: close instead of showing an empty form.
        toast.error(UPDATE_PRODUCT_TOASTS.error)
        handleOpenChange(false)
      })
    return () => {
      ignore = true
    }
    // Runs once per opened product; the callbacks it uses only close the modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, dispatch, form])

  /** Send the form to the backend: update the edited product, or create a new one. */
  const save = (values: ProductFormValues) => {
    const input = toProductInput(values)
    return productId
      ? dispatch(updateProduct({ id: productId, input })).unwrap()
      : dispatch(createProduct(input)).unwrap()
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const toasts = productId ? UPDATE_PRODUCT_TOASTS : CREATE_PRODUCT_TOASTS
    try {
      await save(values)
    } catch (error) {
      const apiError = error as ApiError
      if (productId && apiError.status === 404) return closeAsNotFound()
      if (!applyServerFieldErrors(form, apiError)) toast.error(toasts.error)
      return
    }
    toast.success(toasts.success)
    handleOpenChange(false)
    if (!productId) onCreated?.()
  })

  return {
    form,
    onSubmit,
    handleOpenChange,
    isSaving: form.formState.isSubmitting,
    isLoading,
    title: productId ? 'Edit product' : 'New product',
  }
}
