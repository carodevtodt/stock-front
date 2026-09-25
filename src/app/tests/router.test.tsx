import { screen } from '@testing-library/react'
import { appRoutes } from '@/app/router'
import { renderWithStore } from '@/test/renderWithStore'

describe('app routing', () => {
  it('shows the Product Management heading on the home route', async () => {
    renderWithStore(null, { routes: appRoutes, route: '/' })

    expect(await screen.findByRole('heading', { name: 'Product Management' })).toBeInTheDocument()
  })

  it('shows "Page not found." with a link home on an unknown route', async () => {
    renderWithStore(null, { routes: appRoutes, route: '/does-not-exist' })

    expect(await screen.findByText('Page not found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('heading', { name: 'Product Management' })).toBeInTheDocument()
  })
})
