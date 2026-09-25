import { EMPTY_PRODUCTS_MESSAGE } from '../../../../constants'
import { AddProductButton } from '../AddProductButton'

interface Props {
  onAdd: () => void
}

export function ProductsEmptyState({ onAdd }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-md border p-10 text-center">
      <p className="text-sm text-muted-foreground">{EMPTY_PRODUCTS_MESSAGE}</p>
      <AddProductButton onClick={onAdd} />
    </div>
  )
}
