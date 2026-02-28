import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns API status, version, and uptime',
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
