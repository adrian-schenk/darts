import { ref, onUnmounted, reactive } from "vue";
import { io } from "socket.io-client";
import { useCookies } from "@vueuse/integrations/useCookies";

let socket: any = null;
const status = ref("disconnected");
const data = reactive<any>({});
let users = 0;

export default function useSocket() {
  const cookies = useCookies(["auth_token"]);
  const token = cookies.get("auth_token");

  if (!token) {
    console.warn("No auth token found, skipping socket connection.");
    return {
      socket: null,
      status,
      data,
      send: () => {},
      close: () => {},
    };
  }

  if (!socket) {

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'localhost';
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '3000';
    socket = io(`http://${backendUrl}:${backendPort}`, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      status.value = "connected";
    });

    socket.on("disconnect", () => {
      status.value = "disconnected";
    });

    socket.onAny((event: any, ...args: any[]) => {
      if (!args[0].type) return;
      console.log(`Received event: ${event}`, args[0]);
      if (!data[event]) data[event] = {};
      data[event][args[0].type] = args[0];
    });
  }

  users++;

  function send<TPayload = unknown>(event: string, payload: TPayload) {
    if (!socket) return;
    socket.emit(event, payload);
  }

  function close() {
    if (!socket) return;
    socket.disconnect();
    socket = null;
  }

  onUnmounted(() => {
    users--;
    if (users <= 0 && socket) {
      socket.disconnect();
      socket = null;
    }
  });

  return {
    socket,
    status,
    data,
    send,
    close,
  };
}
