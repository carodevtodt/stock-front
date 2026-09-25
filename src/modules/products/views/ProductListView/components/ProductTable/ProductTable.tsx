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
const COLUMNS = 4

interface Props {
  products: Product[]
  isLoading?: boolean
}

export function ProductTable({ products, isLoading = false }: Props) {
  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Stock</TableHead>
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
              </TableRow>
            ))}
      </TableBody>
    </Table>
  )
}
