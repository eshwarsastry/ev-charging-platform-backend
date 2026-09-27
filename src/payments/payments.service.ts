import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { paymentIntents } from '../database/schema';
import { FASTAG_GATEWAY, type FastagGateway } from './fastag-gateway';

export interface CreatePaymentInput {
  idempotencyKey: string;
  userId: string;
  vehicleRegistration: string;
  sessionReference: string;
  amountPaise: number;
}

@Injectable()
export class PaymentsService {
  public constructor(
    private readonly database: DatabaseService,
    @Inject(FASTAG_GATEWAY) private readonly gateway: FastagGateway,
  ) {}

  public async create(input: CreatePaymentInput) {
    const [existing] = await this.database.db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing) return existing;

    const [intent] = await this.database.db
      .insert(paymentIntents)
      .values({
        ...input,
        vehicleRegistration: input.vehicleRegistration.trim().toUpperCase(),
        currency: 'INR',
        gateway: this.gateway.name,
      })
      .returning();
    if (!intent) throw new Error('Failed to create payment intent');

    const result = await this.gateway.authorize({
      paymentIntentId: intent.id,
      idempotencyKey: intent.idempotencyKey,
      vehicleRegistration: intent.vehicleRegistration,
      amountPaise: intent.amountPaise,
      currency: 'INR',
      sessionReference: intent.sessionReference,
    });

    const [updated] = await this.database.db
      .update(paymentIntents)
      .set({
        status: result.status,
        gatewayReference: result.gatewayReference,
        failureReason: result.failureReason,
        rawResponse: result.rawResponse,
        updatedAt: new Date(),
      })
      .where(eq(paymentIntents.id, intent.id))
      .returning();
    return updated;
  }

  public async getById(id: string) {
    const [intent] = await this.database.db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.id, id))
      .limit(1);
    if (!intent) throw new NotFoundException('Payment intent not found');
    return intent;
  }
}
