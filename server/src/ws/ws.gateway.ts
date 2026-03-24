import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import DartSocketService from './ws.service';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
@Injectable()
export class DartSocket implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private dartSocketService: DartSocketService) {}

  public async ping(socketId: string): Promise<boolean> {
    const client = this.server.sockets.sockets.get(socketId);
    if (client && client.connected) {
      client.emit('ping');

      const pongReceived = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 2000);
        client.once('pong', () => {
          clearTimeout(timeout);
          resolve(true);
        });
      });
      return pongReceived;
    }
    return false;
  }

  async handleConnection(client: Socket): Promise<void> {
    await this.dartSocketService.handleConnection(client);

    client.onAny((event, ...args) => {
      const payload = args.length > 1 ? args : args[0];
      this.dartSocketService.handleMessage(client, event, payload);
      console.log(`Received event: ${event} with args:`, payload);
    });
  }

  async handleDisconnect(client: Socket): Promise<void> {
    await this.dartSocketService.handleDisconnect(client);
  }
}
