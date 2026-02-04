
import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class ApiController {
  @Get()
  findAll(): string {
    return 'This action returns all cats';
  }
}
