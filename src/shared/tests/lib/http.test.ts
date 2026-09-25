import { http as mswHttp, HttpResponse } from 'msw'
import { env } from '@/shared/config/env'
import { http } from '@/shared/lib/http'
import { server } from '@/test/server'

const url = (path: string) => `${env.apiUrl}${path}`

describe('http client', () => {
  it('sends GET to the API base URL with JSON accept header and returns the body', async () => {
    let acceptHeader: string | null = null
    server.use(
      mswHttp.get(url('/health/'), ({ request }) => {
        acceptHeader = request.headers.get('Accept')
        return HttpResponse.json({ status: 'ok' })
      }),
    )

    const body = await http.get('/health/')

    expect(body).toEqual({ status: 'ok' })
    expect(acceptHeader).toBe('application/json')
  })

  it('rejects with status 400 and field errors on a validation response', async () => {
    server.use(
      mswHttp.post(url('/products/'), () =>
        HttpResponse.json({ price: ['Price must be greater than 0.'] }, { status: 400 }),
      ),
    )

    await expect(http.post('/products/', {})).rejects.toMatchObject({
      status: 400,
      fieldErrors: { price: ['Price must be greater than 0.'] },
    })
  })

  it('rejects with the detail as message on a 404 response', async () => {
    server.use(
      mswHttp.get(url('/products/1/'), () =>
        HttpResponse.json({ detail: 'Product not found.' }, { status: 404 }),
      ),
    )

    await expect(http.get('/products/1/')).rejects.toEqual({
      status: 404,
      message: 'Product not found.',
      fieldErrors: {},
    })
  })

  it('rejects with status 0 and a message when the network fails', async () => {
    server.use(mswHttp.get(url('/health/'), () => HttpResponse.error()))

    const error = await http.get('/health/').catch((e: unknown) => e)

    expect(error).toMatchObject({ status: 0, fieldErrors: {} })
    expect((error as { message: string }).message).not.toBe('')
  })
})
