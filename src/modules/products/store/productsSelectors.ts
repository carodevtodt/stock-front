import type { RootState } from '@/app/store'

export const selectProducts = (state: RootState) => state.products.items
