
import { forwardRef, Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { DartsModule } from 'src/darts/darts.module';

@Module({
  imports: [forwardRef(() => DartsModule)],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
