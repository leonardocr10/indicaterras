import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getStatus() {
    return {
      data: {
        name: 'Terras Alphas Indica API',
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
