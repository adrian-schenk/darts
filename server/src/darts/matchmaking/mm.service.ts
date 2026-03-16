import { Injectable } from "@nestjs/common";
import { User } from "src/users/user.entity";
import { DartSocket } from "src/ws/ws.gateway";

enum MMType {
    RANKED,
    UNRANKED,
    SOLO,
    TEAM
}

@Injectable()
export default class MatchmakingService {

    queue: Map<string, Array<User>> = new Map();
    constructor() { }

    findMatch() {

    }

    getElo() {

    }

    updateElo() {

    }

    getQueue(mode: string) {
        return this.queue.get(mode) || [];
    }

    joinQueue(mode: string, user: User) {
        if (!this.queue.has(mode)) {
            this.queue.set(mode, []);
        }
        const queue = this.queue.get(mode);
        if (queue) {
            queue.push(user);
        }
    }

    leaveQueue(mode: string, user: User) {
        if (this.queue.has(mode)) {
            this.queue.set(mode, (this.queue.get(mode) || []).filter(u => u.id !== user.id));
        }
    }
}