import { Body, Controller, Get, Post, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { Environment } from '../config/env';
import { MockFastagGateway } from './mock-fastag.gateway';

const demoSchema = z.object({
  requestId: z.string().uuid(),
  scenario: z.enum(['active', 'low-balance', 'blacklisted']),
});

@ApiTags('sandbox')
@Controller('v1/sandbox')
export class SandboxController {
  public constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly mock: MockFastagGateway,
  ) {}

  @Get('capabilities')
  public capabilities() {
    return {
      paymentSandbox: this.enabled(),
      livePayments: false,
      message:
        'Live FASTag payments require an approved acquiring-bank integration. Discovery does not grant charger control.',
    };
  }

  @Post('fastag/demo')
  public async demo(@Body(new ZodValidationPipe(demoSchema)) input: z.infer<typeof demoSchema>) {
    if (!this.enabled()) throw new ServiceUnavailableException('Payment sandbox is disabled');
    const tagId = {
      active: 'MOCK-ACTIVE-DEMO',
      'low-balance': 'MOCK-LOW-DEMO',
      blacklisted: 'MOCK-BLACK-DEMO',
    }[input.scenario];
    const details = await this.mock.getTagDetails({ tagId, stationReference: 'DEMO-STATION' });
    if (details.status !== 'ACTIVE') {
      return {
        sandbox: true,
        status: 'REJECTED',
        tagStatus: details.status,
        amountPaise: 24000,
        energyWh: 12000,
        message: 'Simulated tag rejected. No funds moved.',
      };
    }
    const result = await this.mock.debit({
      paymentIntentId: input.requestId,
      idempotencyKey: `sandbox:${input.requestId}`,
      tagId,
      vehicleRegistration: details.vehicleRegistration!,
      amountPaise: 24000,
      currency: 'INR',
      sessionReference: input.requestId,
      stationReference: 'DEMO-STATION',
      energyWh: 12000,
    });
    return {
      sandbox: true,
      status: result.status,
      tagStatus: details.status,
      amountPaise: 24000,
      energyWh: 12000,
      reference: result.gatewayReference,
      message: 'Simulation complete. No vehicle was charged and no funds moved.',
    };
  }

  private enabled(): boolean {
    return (
      this.config.get('ENABLE_PAYMENT_SANDBOX', { infer: true }) &&
      this.config.get('FASTAG_MODE', { infer: true }) === 'mock'
    );
  }
}
