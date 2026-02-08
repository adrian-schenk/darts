import { io } from "socket.io-client";
import { useCookies } from "@vueuse/integrations/useCookies.js";
import { ref, onUnmounted } from "vue";

let socket: any;

const status = ref("disconnected");
const data = ref(null);


export default function useSocket() {
  const cookies = useCookies(["auth_token"]);
  const token = cookies.get("auth_token");

  if (!token) return false;

  if (!socket) {
    socket = io(`http://localhost:${import.meta.env.VITE_BACKEND_PORT}`, {
        auth: {
        'token': token,
        },
        transports: ["websocket"],
    });

    socket.on("connect", () => {
        status.value = "connected";
        console.log("socket connected");
    });

    socket.on("disconnect", () => {
        status.value = "disconnected";
    });

    socket.on("message", (msg: any) => {
        console.log('recv', msg);
        data.value = msg;
    });
}

  function send(event: String, payload: any) {
    socket.emit(event, payload);
  }

  function close() {
    socket.disconnect();
  }

  onUnmounted(() => {
    socket?.disconnect();
  });

  return {
    socket,
    status,
    data,
    send,
    close,
  };
}
