import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import DartSocketService from './ws.service';
import jwt from 'jsonwebtoken';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  }
})
@Injectable()
export class DartSocket {
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
  
  handleConnection(client: Socket): void {
    
    this.dartSocketService.handleConnection(client);

    client.addListener('disconnect', () => {
      this.dartSocketService.handleDisconnect(client);
    })

    client.addListener('dart_event', (msg) => {
      this.dartSocketService.handleMessage(client, 'dart_event', msg);
    })

    client.addListener('message', (msg) => {
      this.dartSocketService.handleMessage(client, 'message', msg);
    })
  }
}
