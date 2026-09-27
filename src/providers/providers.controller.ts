import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminApiKeyGuard } from '../common/admin-api-key.guard';
import { ProviderSyncService } from './provider-sync.service';

@ApiTags('providers')
@Controller('v1/providers')
export class ProvidersController {
  public constructor(private readonly syncService: ProviderSyncService) {}

  @Get()
  @ApiOperation({ summary: 'List supported live-data provider integrations' })
  public list(): { data: ReturnType<ProviderSyncService['status']> } {
    return { data: this.syncService.status() };
  }

  @Post(':providerId/sync')
  @UseGuards(AdminApiKeyGuard)
  @ApiHeader({ name: 'x-admin-api-key', required: true })
  @ApiOperation({ summary: 'Synchronize live OCPI location data from a provider' })
  public sync(@Param('providerId') providerId: string) {
    return this.syncService.sync(providerId);
  }
}
