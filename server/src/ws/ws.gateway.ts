import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import ChatService from './ws.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  }
})
export class DartSocket {
  @WebSocketServer()
  server: Server;

  sessions: Map<string, Socket[]> = new Map();

  constructor(private chatService: ChatService) {}
  
  handleConnection(client: Socket): void {
    if (!client.handshake.auth.token) {
      client.emit('error', { message: 'Unauthorized', status: 401 });
      setTimeout(() => client.disconnect(), 500);
      return;
    }

    if (!this.sessions.has('test')) {
      this.sessions.set('test', []);
    }
    this.sessions.get('test')?.push(client);

    client.addListener('disconnect', () => {
      console.log(`Client disconnected: ${client.id}`);
    })
    client.addListener('message', (msg) => {
      this.sessions.get('test')?.forEach(c => {
        this.server.to(c.id).emit('message', msg);
      });
    })
    
    console.log(`Client connected: ${client.id} from ${client.client.conn.remoteAddress}, token: ${client.handshake.auth.token}`);
  }
}
