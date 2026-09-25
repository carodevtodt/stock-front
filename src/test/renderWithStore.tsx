import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { makeStore, type RootState } from '@/app/store'

interface Options {
  route?: string
  routes?: RouteObject[]
  preloadedState?: Partial<RootState>
}

/** Render with a fresh Redux store and an in-memory router. Pass `routes` to render an app route tree. */
export function renderWithStore(ui: ReactElement | null, options: Options = {}) {
  const { route = '/', routes, preloadedState } = options
  const store = makeStore(preloadedState)
  const router = createMemoryRouter(routes ?? [{ path: '*', element: ui }], {
    initialEntries: [route],
  })

  return {
    store,
    router,
    ...render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>,
    ),
  }
}
