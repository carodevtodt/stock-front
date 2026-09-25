import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { ProductFormModal } from './components/ProductFormModal'
import { useProductListView } from './useProductListView'

export function ProductListView() {
  const { isFormOpen, openForm, setFormOpen } = useProductListView()

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Products</h2>
        <Button onClick={openForm}>
          <Plus aria-hidden />
          Add product
        </Button>
      </div>
      <ProductFormModal open={isFormOpen} onOpenChange={setFormOpen} />
    </section>
  )
}
