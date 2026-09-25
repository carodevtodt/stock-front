import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { NotFound } from './layout/NotFound'
import { RootLayout } from './layout/RootLayout'

// Module routes (e.g. products.routes.tsx) are spread into `children`.
export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: null },
      { path: '*', element: <NotFound /> },
    ],
  },
]

export const router = createBrowserRouter(appRoutes)
