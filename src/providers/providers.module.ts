import { Module } from '@nestjs/common';
import { AdminApiKeyGuard } from '../common/admin-api-key.guard';
import { StationsModule } from '../stations/stations.module';
import { ProviderConfigService } from './provider-config.service';
import { ProviderSyncService } from './provider-sync.service';
import { ProvidersController } from './providers.controller';

@Module({
  imports: [StationsModule],
  controllers: [ProvidersController],
  providers: [ProviderConfigService, ProviderSyncService, AdminApiKeyGuard],
})
export class ProvidersModule {}
