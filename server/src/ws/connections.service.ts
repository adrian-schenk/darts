import { Injectable } from "@nestjs/common";

@Injectable()
export default class ConnectionsService {

    private clientsMap: Map<string, any> = new Map();

    constructor() { }

    handleConnection(client: any) {
        console.log(`Client connected: ${client.id} from ${client.client.conn.remoteAddress}, token: ${client.handshake.auth.token}`);
        if (!client.handshake.auth.token) {
            client.emit('error', { message: 'Unauthorized', status: 401 });
            setTimeout(() => client.disconnect(), 500);
            return;
        }
        this.clientsMap.set(client.id, client);
    }

    handleDisconnect(client: any) {
        console.log(`Client disconnected: ${client.id}`);
        this.clientsMap.delete(client.id);
    }

    getClients() {
        return Array.from(this.clientsMap.values());
    }

    getClientById(id: string) {
        return this.clientsMap.get(id) || null;
    }

}