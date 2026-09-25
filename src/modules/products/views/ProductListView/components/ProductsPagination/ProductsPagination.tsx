import type { MouseEvent } from 'react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/components/ui/pagination'
import { pageNumbers, pageRange } from '../../../../store/pagination'

interface Props {
  page: number
  totalPages: number
  count: number
  onPageChange: (page: number) => void
}

/** Props that make a shadcn pagination anchor look and behave disabled. */
function disabledProps(disabled: boolean) {
  return disabled
    ? { 'aria-disabled': true, tabIndex: -1, className: 'pointer-events-none opacity-50' }
    : {}
}

export function ProductsPagination({ page, totalPages, count, onPageChange }: Props) {
  const { first, last } = pageRange(page, count)
  const pages = pageNumbers(totalPages)

  // The page lives in the store, not the URL: links never navigate, and a click on a disabled
  // or current link sends no request.
  const go = (target: number) => (event: MouseEvent) => {
    event.preventDefault()
    if (target < 1 || target > totalPages || target === page) return
    onPageChange(target)
  }

  return (
    <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing {first}–{last} of {count}
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={go(page - 1)} {...disabledProps(page === 1)} />
          </PaginationItem>
          {pages.map((n) => (
            <PaginationItem key={n}>
              <PaginationLink href="#" isActive={n === page} onClick={go(n)}>
                {n}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={go(page + 1)}
              {...disabledProps(page === totalPages)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
