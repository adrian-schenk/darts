import { forwardRef, Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { DartsModule } from 'src/darts/darts.module';
import { WsModule } from 'src/ws/ws.module';

@Module({
  imports: [forwardRef(() => DartsModule), forwardRef(() => WsModule)],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
