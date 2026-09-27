import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PaymentsService, type CreatePaymentInput } from './payments.service';

const createPaymentSchema = z.object({
  userId: z.string().uuid(),
  vehicleRegistration: z.string().trim().min(4).max(15),
  sessionReference: z.string().min(1).max(128),
  amountPaise: z.number().int().positive().max(10_000_000),
});

type CreatePaymentBody = Omit<CreatePaymentInput, 'idempotencyKey'>;

@ApiTags('payments')
@Controller('v1/payments')
export class PaymentsController {
  public constructor(private readonly payments: PaymentsService) {}

  @Post('fastag/intents')
  @ApiHeader({ name: 'idempotency-key', required: true })
  @ApiOperation({ summary: 'Create and authorize a FASTag-backed charging payment intent' })
  public create(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body(new ZodValidationPipe(createPaymentSchema)) body: CreatePaymentBody,
  ) {
    if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
      throw new BadRequestException('idempotency-key must contain 16 to 128 characters');
    }
    return this.payments.create({ ...body, idempotencyKey });
  }

  @Get('intents/:id')
  @ApiOperation({ summary: 'Get the current payment intent state' })
  public get(@Param('id') id: string) {
    return this.payments.getById(id);
  }
}
