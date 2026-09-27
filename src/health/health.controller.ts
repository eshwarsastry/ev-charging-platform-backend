import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  public constructor(private readonly database: DatabaseService) {}

  @Get('live')
  @ApiOperation({ summary: 'Process liveness probe' })
  public live(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Database-backed readiness probe' })
  public async ready(): Promise<{ status: string; database: string }> {
    await this.database.ping();
    return { status: 'ready', database: 'reachable' };
  }
}
