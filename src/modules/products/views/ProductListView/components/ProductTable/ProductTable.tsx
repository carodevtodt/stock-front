import { Pencil } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { PAGE_SIZE } from '../../../../constants'
import type { Product } from '../../../../types/product'

const SKELETON_ROWS = PAGE_SIZE
const COLUMNS = 5

interface Props {
  products: Product[]
  isLoading?: boolean
  onEdit: (product: Product) => void
}

export function ProductTable({ products, isLoading = false, onEdit }: Props) {
  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead className="w-0">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody aria-busy={isLoading}>
        {isLoading
          ? Array.from({ length: SKELETON_ROWS }, (_, row) => (
              <TableRow key={row} data-testid="product-row-skeleton">
                {Array.from({ length: COLUMNS }, (_, col) => (
                  <TableCell key={col}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.description ?? '—'}</TableCell>
                <TableCell className="text-right">{product.price}</TableCell>
                <TableCell className="text-right">{product.stock}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Edit ${product.name}`}
                      onClick={() => onEdit(product)}
                    >
                      <Pencil aria-hidden />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
      </TableBody>
    </Table>
  )
}
