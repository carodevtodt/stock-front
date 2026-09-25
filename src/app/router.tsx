import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { productsRoutes } from '@/modules/products'
import { NotFound } from './layout/NotFound'
import { RootLayout } from './layout/RootLayout'

// Module routes (e.g. products.routes.tsx) are spread into `children`.
export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/products" replace /> },
      ...productsRoutes,
      { path: '*', element: <NotFound /> },
    ],
  },
]

export const router = createBrowserRouter(appRoutes)
