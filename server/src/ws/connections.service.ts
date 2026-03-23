import { Injectable } from "@nestjs/common";
import { Socket } from "node_modules/socket.io/dist/socket";
import { JwtStrategy } from "src/auth/jwt.strategy";
import DartsGameService from "src/darts/game/game.service";
import { Inject, forwardRef } from "@nestjs/common";
import MatchmakingService from "src/darts/matchmaking/mm.service";

@Injectable()
export default class ConnectionsService {

    private clientsMap: Map<string, Socket> = new Map();

    constructor(
        private jwtStrategy: JwtStrategy,
        private readonly matchmakingService: MatchmakingService,
        @Inject(forwardRef(() => DartsGameService)) private readonly gameService: DartsGameService
    ) { }

    async handleConnection(client: Socket) {
        if (!client.handshake.auth.token) {
            client.emit('error', { message: 'Unauthorized', status: 401 });
            setTimeout(() => client.disconnect(), 500);
            return;
        }
        try {
            const user = await this.jwtStrategy.validateToken(client.handshake.auth.token);
            if (!user) {
                client.emit('error', { message: 'Unauthorized', status: 401 });
                setTimeout(() => client.disconnect(), 500);
                return;
            }
            console.log(`Authenticated user ${user.username} (${user.id}) connected with socket ${client.id}`);
            client.data.user = user;
            client.data.userId = user.id;
        } catch (err) {
            console.error(`Authentication error for client ${client.id}:`, err);
            client.emit('error', { message: 'Unauthorized', status: 401 });
            setTimeout(() => client.disconnect(), 500);
            return;
        }
        this.clientsMap.set(client.id, client);
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

}