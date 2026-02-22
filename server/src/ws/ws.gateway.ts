import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import DartSocketService from './ws.service';
import jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  }
})
export class DartSocket {
  @WebSocketServer()
  server: Server;

  constructor(private dartSocketService: DartSocketService) {}
  
  handleConnection(client: Socket): void {
    const token = client.handshake.auth.token;
    if (!token) {
      client.emit('error', { message: 'Unauthorized', status: 401 });
      setTimeout(() => client.disconnect(), 500);
      return;
    }

    try {
      const secret = process.env.JWT_SECRET ?? 'dev-only-secret-change-me';
      jwt.verify(token, secret);
    } catch (err) {
      client.emit('error', { message: 'Invalid token', status: 401 });
      setTimeout(() => client.disconnect(), 500);
      return;
    }

    client.addListener('disconnect', () => {
      this.dartSocketService.handleDisconnect(client);
    })

    client.addListener('dart_event', (msg) => {
      this.dartSocketService.handleMessage(client, 'dart_event', msg);
    })

    client.addListener('message', (msg) => {
      this.dartSocketService.handleMessage(client, 'message', msg);
    })
    
    console.log(`Client connected: ${client.id} from ${client.client.conn.remoteAddress}, token: ${token}`);
  }
}
