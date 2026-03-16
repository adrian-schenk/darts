import { Injectable } from "@nestjs/common";
import DartsGameService from "../game/game.service";
import { Socket } from "socket.io";

@Injectable()
export default class DartsEventService {
 
    constructor(private readonly gameService: DartsGameService) { }

    handleDartsEvent(socket: Socket, msg: any) {
        switch (msg.type) {
            case 'dart_hit':
                break;
            case 'dart_remove':
                break;
            default:
                console.warn('Unknown dart event type:', msg.type);
                break;
        }
        console.log(this.gameService.joinedClients)
        for (const client of this.gameService.joinedClients.get(socket.data.gameId) || []) {
            client.emit('dart-event', msg);
        }
        console.log('Handling dart event:', msg, socket.id);

    }
}