import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { io, type Socket } from 'socket.io-client'

const BACKEND_URL = 'http://localhost:3000'
const TEST_USER = { username: 'test_socket_user', email: 'test_socket@test.com', password: 'Test1234!' }

let token: string
let socket: Socket

describe('socket integration', () => {
  beforeAll(async () => {
    token = 'token'
  })

  afterAll(() => {
    socket?.disconnect()
  })

  it('is rejected without a token', () => {
    return new Promise<void>((resolve, reject) => {
      const unauthedSocket = io(BACKEND_URL, {
        transports: ['websocket'],
      })

      const timeout = setTimeout(() => reject(new Error('Expected error event')), 5000)

      unauthedSocket.on('error', (err) => {
        clearTimeout(timeout)
        expect(err).toMatchObject({ status: 401 })
        unauthedSocket.disconnect()
        resolve()
      })

      unauthedSocket.on('connect_error', (err) => {
        clearTimeout(timeout)
        unauthedSocket.disconnect()
        reject(err)
      })
    })
  })
})
