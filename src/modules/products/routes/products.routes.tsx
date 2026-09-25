import type { RouteObject } from 'react-router-dom'
import { ProductListView } from '../views/ProductListView'

export const productsRoutes: RouteObject[] = [{ path: 'products', element: <ProductListView /> }]
