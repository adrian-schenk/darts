import { ref, onUnmounted } from "vue";
import { io } from "socket.io-client";
import { useCookies } from "@vueuse/integrations/useCookies";

let socket: any = null;
const status = ref("disconnected");
const data = ref<any>(null);
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

    socket.on("message", (msg: any) => {
      console.log("recv", msg);
      data.value = msg;
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
