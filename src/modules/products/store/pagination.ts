import { PAGE_SIZE } from '../constants'

/** Positions (1-based) of the first and last product shown on `page`. */
export function pageRange(page: number, count: number) {
  return { first: (page - 1) * PAGE_SIZE + 1, last: Math.min(page * PAGE_SIZE, count) }
}

/** Page numbers 1..totalPages. */
export function pageNumbers(totalPages: number) {
  return Array.from({ length: totalPages }, (_, i) => i + 1)
}
