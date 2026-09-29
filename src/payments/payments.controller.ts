import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminApiKeyGuard } from '../common/admin-api-key.guard';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PaymentsService } from './payments.service';

const identifySchema = z.object({
  userId: z.string().uuid(),
  stationReference: z.string().min(1).max(128),
  tagId: z.string().min(4).max(128),
  tid: z.string().min(1).max(128).optional(),
  expectedVehicleRegistration: z.string().trim().min(4).max(15).optional(),
});

const settleSchema = z.object({
  tagId: z.string().min(4).max(128),
  tid: z.string().min(1).max(128).optional(),
  amountPaise: z.number().int().positive().max(10_000_000),
  energyWh: z.number().int().positive().max(1_000_000).optional(),
});

function requireIdempotencyKey(value: string): string {
  if (!value || value.length < 16 || value.length > 128) {
    throw new BadRequestException('idempotency-key must contain 16 to 128 characters');
  }
  return value;
}

@ApiTags('payments')
@Controller('v1/payments')
@UseGuards(AdminApiKeyGuard)
@ApiHeader({ name: 'x-admin-api-key', required: true })
export class PaymentsController {
  public constructor(private readonly payments: PaymentsService) {}

  @Post('fastag/sessions/identify')
  @ApiHeader({ name: 'idempotency-key', required: true })
  @ApiOperation({
    summary: 'Read FASTag through the acquirer/NETC Mapper before starting EV charging',
  })
  public identify(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body(new ZodValidationPipe(identifySchema)) body: z.infer<typeof identifySchema>,
  ) {
    return this.payments.identify({ ...body, lookupKey: requireIdempotencyKey(idempotencyKey) });
  }

  @Post('fastag/sessions/:id/settle')
  @ApiHeader({ name: 'idempotency-key', required: true })
  @ApiOperation({ summary: 'Debit the final EV charging amount through NETC FASTag' })
  public settle(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body(new ZodValidationPipe(settleSchema)) body: z.infer<typeof settleSchema>,
  ) {
    return this.payments.settle({
      ...body,
      sessionId: id,
      idempotencyKey: requireIdempotencyKey(idempotencyKey),
    });
  }

  @Get('fastag/sessions/:id')
  @ApiOperation({ summary: 'Get NETC EV FASTag session state' })
  public getSession(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.payments.getSession(id);
  }

  @Get('intents/:id')
  @ApiOperation({ summary: 'Get the current payment intent state' })
  public get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.payments.getById(id);
  }
}
