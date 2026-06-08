import { ref, onUnmounted, reactive } from 'vue'
import { io } from 'socket.io-client'
import { useCookies } from '@vueuse/integrations/useCookies'
import router from '@/router'

let socket: any = null
let socketId = ref('')
const status = ref('disconnected')
const data = reactive<any>({})
let users = 0

export default function useSocket() {
  const cookies = useCookies(['auth_token'])
  const token = cookies.get('auth_token')

  if (!token) {
    console.warn('No auth token found, skipping socket connection.')
    return {
      socket: null,
      status,
      data,
      send: () => {},
      close: () => {},
    }
  }

  if (!socket) {
    socket = io(`/`, {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('connect', () => {})

    socket.on('connected', (msg: any) => {
      status.value = 'connected'
      socketId.value = socket.id
    })

    socket.on('disconnect', () => {
      status.value = 'disconnected'
    })

    socket.on('ping', () => {
      socket.emit('pong')
    })

    socket.on('match_found', (matchData: any) => {
      if (matchData.gameId) {
        router.replace(`/game/${matchData.gameId}`)
      }
    })

    socket.on('tournament_match_found', (matchData: any) => {
      if (matchData.gameId) {
        router.replace(`/game/${matchData.gameId}`)
      }
    })

    socket.onAny((event: any, ...args: any[]) => {
      if (!args[0].type) return
      console.log(`Received event: ${event}`, args[0])
      if (!data[event]) data[event] = {}
      data[event][args[0].type] = args[0]
    })
  }

  users++

  function send<TPayload = unknown>(event: string, payload: TPayload): Promise<void> {
    return new Promise((resolve) => {
      if (!socket) return resolve()
      if (status.value === 'connected') {
        socket.emit(event, payload)
        return resolve()
      }
      socket.once('connected', () => {
        socket.emit(event, payload)
        resolve()
      })
    })
  }

  function close() {
    if (!socket) return
    socket.disconnect()
    socket = null
  }

  onUnmounted(() => {
    users--
    if (users <= 0 && socket) {
      socket.disconnect()
      socket = null
    }
  })

  return {
    socketId: socketId,
    socket,
    status,
    data,
    send,
    close,
  }
}
