import { Injectable } from "@nestjs/common";

@Injectable()
export default class DartsEventService {
 
    constructor() { }

    handleDartsEvent(client: any, msg: any) {
        switch (msg.type) {
            case 'dart_hit':
                break;
            case 'dart_remove':
                break;
            default:
                console.warn('Unknown dart event type:', msg.type);
        }
        console.log('Handling dart event:', msg, client.id);
    }
}