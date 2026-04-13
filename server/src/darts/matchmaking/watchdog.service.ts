import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/users/user.entity";
import MatchmakingService from "./mm.service";

@Injectable()
export default class WatchDogService {

    constructor(@Inject(forwardRef(() => MatchmakingService)) private readonly matchmakingService: MatchmakingService, @InjectRepository(User) private readonly repository: any) {}

    
}
