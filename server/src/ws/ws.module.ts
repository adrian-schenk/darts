import { forwardRef, Module } from '@nestjs/common';
import { DartsModule } from 'src/darts/darts.module';
import DartSocketService from './ws.service';
import ConnectionsService from './connections.service';
import { DartSocket } from './ws.gateway';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [forwardRef(() => DartsModule), forwardRef(() => AuthModule)],
  providers: [DartSocketService, ConnectionsService, DartSocket],
  exports: [DartSocketService, ConnectionsService, DartSocket],
})
export class WsModule {}
