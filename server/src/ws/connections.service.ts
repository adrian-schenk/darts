import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import DartsGameService from 'src/darts/game/game.service';
import { Inject, forwardRef } from '@nestjs/common';
import MatchmakingService from 'src/darts/matchmaking/mm.service';

@Injectable()
export default class ConnectionsService {
  private clientsMap: Map<string, Socket> = new Map();

  constructor(
    private jwtStrategy: JwtStrategy,
    @Inject(forwardRef(() => MatchmakingService))
    private readonly matchmakingService: MatchmakingService,
    @Inject(forwardRef(() => DartsGameService))
    private readonly gameService: DartsGameService,
  ) {}

  async handleConnection(client: Socket) {
    //await new Promise((resolve) => setTimeout(resolve, 1000)); // Small delay to ensure handshake data is available
    if (!client.handshake.auth.token) {
      client.emit('error', { message: 'Unauthorized', status: 401 });
      setTimeout(() => client.disconnect(), 500);
      return;
    }
    try {
      const user = await this.jwtStrategy.validateToken(
        client.handshake.auth.token,
      );
      if (!user) {
        client.emit('error', { message: 'Unauthorized', status: 401 });
        setTimeout(() => client.disconnect(), 500);
        return;
      }
      console.log(
        `Authenticated user ${user.username} (${user.id}) connected with socket ${client.id}`,
      );
      client.data.user = user;
      client.data.userId = user.id;
    } catch (err) {
      console.error(`Authentication error for client ${client.id}:`, err);
      client.emit('error', { message: 'Unauthorized', status: 401 });
      setTimeout(() => client.disconnect(), 500);
      return;
    }
    this.clientsMap.set(client.id, client);

    client.emit('connected', { message: 'Connection established' });
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.clientsMap.delete(client.id);
    this.gameService.leaveDartGame(client.data.gameId, client);
  }

  getClients() {
    return Array.from(this.clientsMap.values());
  }

  getClientById(id: string) {
    return this.clientsMap.get(id) || null;
  }

  async getUserBySocketId(socketId: string) {
    const client = this.getClientById(socketId);
    if (!client) {
      return null;
    }
    if (!client.data.user) {
      throw new Error('User not found for socket');
    }
    return client.data.user;
  }

  broadcast(socketIds: string[], event: string, data: any) {
    for (const socketId of socketIds) {
      const client = this.getClientById(socketId);
      if (client) {
        client.emit(event, data);
      }
    }
  }
}
