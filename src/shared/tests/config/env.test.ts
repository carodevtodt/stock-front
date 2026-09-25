describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('falls back to http://localhost:8000/api when VITE_API_URL is not set', async () => {
    vi.stubEnv('VITE_API_URL', undefined)
    vi.resetModules()

    const { env } = await import('@/shared/config/env')

    expect(env.apiUrl).toBe('http://localhost:8000/api')
  })

  it('uses VITE_API_URL when it is set', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    vi.resetModules()

    const { env } = await import('@/shared/config/env')

    expect(env.apiUrl).toBe('https://api.example.com')
  })
})
