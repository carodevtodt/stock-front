import { AddProductButton } from './components/AddProductButton'
import { ProductFormModal } from './components/ProductFormModal'
import { ProductsEmptyState } from './components/ProductsEmptyState'
import { ProductsLoadError } from './components/ProductsLoadError'
import { ProductsPagination } from './components/ProductsPagination'
import { ProductTable } from './components/ProductTable'
import { useProductListView } from './useProductListView'

export function ProductListView() {
  const {
    products,
    status,
    count,
    page,
    totalPages,
    error,
    goToPage,
    onCreated,
    retry,
    form,
  } = useProductListView()
  const isLoading = status === 'idle' || status === 'loading'
  const isEmpty = status === 'succeeded' && count === 0
  // Only one Add button at a time: the header one appears once there are products (or the load
  // failed); the empty state has its own. Hidden during the first load, so it never swaps mid-click.
  const showHeaderAdd = count > 0 || status === 'failed'

  function renderContent() {
    if (status === 'failed') return <ProductsLoadError message={error ?? ''} onRetry={retry} />
    if (isEmpty) return <ProductsEmptyState onAdd={form.open} />
    return (
      <>
        <ProductTable products={products} isLoading={isLoading} />
        {count > 0 && (
          <ProductsPagination
            page={page}
            totalPages={totalPages}
            count={count}
            onPageChange={goToPage}
          />
        )}
      </>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Products</h2>
        {showHeaderAdd && <AddProductButton onClick={form.open} />}
      </div>
      {renderContent()}
      <ProductFormModal
        open={form.isOpen}
        onOpenChange={form.onOpenChange}
        onCreated={onCreated}
      />
    </section>
  )
}
