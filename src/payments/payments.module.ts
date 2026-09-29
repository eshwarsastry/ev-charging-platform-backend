import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/env';
import { FASTAG_GATEWAY } from './fastag-gateway';
import { MockFastagGateway } from './mock-fastag.gateway';
import { PartnerFastagGateway } from './partner-fastag.gateway';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SandboxController } from './sandbox.controller';
import { AdminApiKeyGuard } from '../common/admin-api-key.guard';

@Module({
  controllers: [PaymentsController, SandboxController],
  providers: [
    AdminApiKeyGuard,
    MockFastagGateway,
    PartnerFastagGateway,
    {
      provide: FASTAG_GATEWAY,
      inject: [ConfigService, MockFastagGateway, PartnerFastagGateway],
      useFactory: (
        config: ConfigService<Environment, true>,
        mock: MockFastagGateway,
        partner: PartnerFastagGateway,
      ) => (config.get('FASTAG_MODE', { infer: true }) === 'partner' ? partner : mock),
    },
    PaymentsService,
  ],
})
export class PaymentsModule {}
