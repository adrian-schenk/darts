import { Injectable } from "@nestjs/common";
import { Socket } from "node_modules/socket.io/dist/socket";
import DartsEventService from "src/darts/darts_event/dartsevent.service";
import ConnectionsService from "./connections.service";

@Injectable()
export default class DartSocketService {

    private handlerMap: Record<string, (client: Socket, msg: any) => void>;

    constructor(dartsEventService: DartsEventService, private connectionsService: ConnectionsService) {
        this.handlerMap = {
            'dart_event': dartsEventService.handleDartsEvent.bind(dartsEventService)
        };
    }

    handleConnection(client: Socket) {
        this.connectionsService.handleConnection(client);
    }

    handleDisconnect(client: Socket) {
        this.connectionsService.handleDisconnect(client);
    }

    handleMessage(client: Socket, channel: string, msg: any) {
        const handler = this.handlerMap[channel];
        if (handler) {
            handler(client, msg);
        } else {
            console.warn(`No handler for channel: ${channel}`);
        }
    }
}