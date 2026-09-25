/** Products per page. Mirrors the backend's `DefaultPagination.page_size`. */
export const PAGE_SIZE = 10

/** UI texts from docs/design-system.md. */
export const ADD_PRODUCT_LABEL = 'Add product'
export const EMPTY_PRODUCTS_MESSAGE = 'No products yet, please add one.'
export const LIST_PRODUCTS_ERROR = 'Could not load products.'

/** Delete confirmation texts (docs/features/04-delete-product.md). */
export const DELETE_PRODUCT_DIALOG = {
  title: 'Delete product?',
  body: (name: string) => `"${name}" will be permanently deleted.`,
  warning: 'This action cannot be undone.',
  cancel: 'Cancel',
  confirm: 'Delete',
  deleting: 'Deleting…',
} as const
