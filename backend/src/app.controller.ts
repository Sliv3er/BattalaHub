import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  getHealth() {
    return 'Battala Hub Alive';
  }

  @Get()
  @ApiOperation({ summary: 'Root endpoint' })
  getRoot() {
    return {
      name: 'Battala Hub API',
      version: '1.0.0',
      description: 'Real-time communication platform API',
      documentation: '/api/docs',
    };
  }
}