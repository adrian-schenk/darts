import { forwardRef, Module } from "@nestjs/common";
import { DartsModule } from "src/darts/darts.module";
import DartSocketService from "./ws.service";
import ConnectionsService from "./connections.service";

@Module({
  imports: [forwardRef(() => DartsModule)],
  providers: [DartSocketService, ConnectionsService],
  exports: [DartSocketService, ConnectionsService]
})
export class WsModule {}