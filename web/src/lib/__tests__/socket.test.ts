import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSocket = {
  on: vi.fn(),
  once: vi.fn(),
  emit: vi.fn(),
  onAny: vi.fn(),
  disconnect: vi.fn(),
  id: 'test-socket-id',
  connected: true,
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}))

const mockGet = vi.fn()
vi.mock('@vueuse/integrations/useCookies', () => ({
  useCookies: vi.fn(() => ({ get: mockGet })),
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return { ...actual, onUnmounted: vi.fn() }
})

describe('useSocket', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns null socket when no auth token', async () => {
    mockGet.mockReturnValue(null)
    const { default: useSocket } = await import('../socket')
    const { socket } = useSocket()
    expect(socket).toBeNull()
  })

  it('creates a websocket connection with the auth token', async () => {
    mockGet.mockReturnValue('my-jwt-token')
    const { io } = await import('socket.io-client')
    const { default: useSocket } = await import('../socket')
    useSocket()
    expect(io).toHaveBeenCalledWith(
      expect.stringContaining('http://'),
      expect.objectContaining({
        auth: { token: 'my-jwt-token' },
        transports: ['websocket'],
      }),
    )
  })

  it('reuses the same socket on subsequent calls', async () => {
    mockGet.mockReturnValue('my-jwt-token')
    const { io } = await import('socket.io-client')
    const { default: useSocket } = await import('../socket')
    useSocket()
    useSocket()
    expect(io).toHaveBeenCalledTimes(1)
  })

  it('sets status to connected on "connected" event', async () => {
    mockGet.mockReturnValue('my-jwt-token')
    const { default: useSocket } = await import('../socket')
    const { status } = useSocket()
    const connectedHandler = mockSocket.on.mock.calls.find(([e]) => e === 'connected')?.[1]
    connectedHandler?.({})
    expect(status.value).toBe('connected')
  })

  it('sets status to disconnected on "disconnect" event', async () => {
    mockGet.mockReturnValue('my-jwt-token')
    const { default: useSocket } = await import('../socket')
    const { status } = useSocket()
    const connectedHandler = mockSocket.on.mock.calls.find(([e]) => e === 'connected')?.[1]
    connectedHandler?.({})
    expect(status.value).toBe('connected')
    const disconnectHandler = mockSocket.on.mock.calls.find(([e]) => e === 'disconnect')?.[1]
    disconnectHandler?.()
    expect(status.value).toBe('disconnected')
  })

  it('emits pong when ping is received', async () => {
    mockGet.mockReturnValue('my-jwt-token')
    const { default: useSocket } = await import('../socket')
    useSocket()
    const pingHandler = mockSocket.on.mock.calls.find(([e]) => e === 'ping')?.[1]
    pingHandler?.()
    expect(mockSocket.emit).toHaveBeenCalledWith('pong')
  })

  it('send emits the event immediately when connected', async () => {
    mockGet.mockReturnValue('my-jwt-token')
    const { default: useSocket } = await import('../socket')
    const { send, status } = useSocket()
    status.value = 'connected'
    await send('dart-event', { score: 20 })
    expect(mockSocket.emit).toHaveBeenCalledWith('dart-event', { score: 20 })
  })

  it('send waits for connected event before emitting', async () => {
    mockGet.mockReturnValue('my-jwt-token')
    const { default: useSocket } = await import('../socket')
    const { send } = useSocket()

    let onceCallback: (...args: any[]) => void = () => {}
    mockSocket.once.mockImplementation((_event: string, cb: (...args: any[]) => void) => {
      onceCallback = cb
    })

    const sendPromise = send('dart-event', { score: 20 })
    onceCallback()
    await sendPromise

    expect(mockSocket.emit).toHaveBeenCalledWith('dart-event', { score: 20 })
  })
})
