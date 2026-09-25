import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { productsSlice } from '@/modules/products/store/productsSlice'

// Feature modules register their slices here (e.g. `combineSlices(productsSlice)`).
export const rootReducer = combineSlices(productsSlice)

export const makeStore = (preloadedState?: Partial<RootState>) =>
  configureStore({ reducer: rootReducer, preloadedState })

export const store = makeStore()

export type RootState = ReturnType<typeof rootReducer>
export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
