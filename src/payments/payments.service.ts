import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { fastagSessions, paymentIntents } from '../database/schema';
import { FASTAG_GATEWAY, type FastagGateway } from './fastag-gateway';

export interface IdentifyFastagInput {
  lookupKey: string;
  userId: string;
  stationReference: string;
  tagId: string;
  tid?: string;
  expectedVehicleRegistration?: string;
}

export interface SettleFastagInput {
  idempotencyKey: string;
  sessionId: string;
  tagId: string;
  tid?: string;
  amountPaise: number;
  energyWh?: number;
}

function fingerprint(value: string): string {
  return createHash('sha256').update(value.trim()).digest('hex');
}

@Injectable()
export class PaymentsService {
  public constructor(
    private readonly database: DatabaseService,
    @Inject(FASTAG_GATEWAY) private readonly gateway: FastagGateway,
  ) {}

  public async identify(input: IdentifyFastagInput) {
    const [existing] = await this.database.db.select().from(fastagSessions)
      .where(eq(fastagSessions.lookupKey, input.lookupKey)).limit(1);
    if (existing) return existing;

    const details = await this.gateway.getTagDetails({
      tagId: input.tagId,
      tid: input.tid,
      stationReference: input.stationReference,
    });

    const expected = input.expectedVehicleRegistration?.trim().toUpperCase();
    const actual = details.vehicleRegistration?.trim().toUpperCase();
    const usable = details.status === 'ACTIVE' || details.status === 'EXEMPTED';
    const registrationMatches = !expected || !actual || expected === actual;
    const status = usable && registrationMatches ? 'TAG_VERIFIED' : 'REJECTED';

    const [session] = await this.database.db.insert(fastagSessions).values({
      lookupKey: input.lookupKey,
      userId: input.userId,
      stationReference: input.stationReference,
      tagFingerprint: fingerprint(input.tagId),
      vehicleRegistration: actual,
      vehicleClass: details.vehicleClass,
      issuerBankId: details.issuerBankId,
      exceptionCode: details.exceptionCode,
      tagStatus: details.status,
      status,
    }).returning();

    if (!session) throw new Error('Failed to create FASTag session');
    return session;
  }

  public async settle(input: SettleFastagInput) {
    const [session] = await this.database.db.select().from(fastagSessions)
      .where(eq(fastagSessions.id, input.sessionId)).limit(1);
    if (!session) throw new NotFoundException('FASTag session not found');
    if (session.status !== 'TAG_VERIFIED') {
      throw new BadRequestException('FASTag session is not eligible for settlement');
    }
    if (!session.vehicleRegistration) {
      throw new BadRequestException('NETC Mapper did not return a vehicle registration');
    }
    if (session.tagFingerprint !== fingerprint(input.tagId)) {
      throw new BadRequestException('FASTag presented at settlement does not match verified tag');
    }

    const [existing] = await this.database.db.select().from(paymentIntents)
      .where(eq(paymentIntents.idempotencyKey, input.idempotencyKey)).limit(1);
    if (existing) return existing;

    const [intent] = await this.database.db.insert(paymentIntents).values({
      idempotencyKey: input.idempotencyKey,
      userId: session.userId,
      vehicleRegistration: session.vehicleRegistration,
      sessionReference: session.id,
      amountPaise: input.amountPaise,
      currency: 'INR',
      gateway: this.gateway.name,
    }).returning();
    if (!intent) throw new Error('Failed to create payment intent');

    await this.database.db.update(fastagSessions).set({
      status: 'SETTLING',
      paymentIntentId: intent.id,
      amountPaise: input.amountPaise,
      energyWh: input.energyWh,
      updatedAt: new Date(),
    }).where(eq(fastagSessions.id, session.id));

    const result = await this.gateway.debit({
      paymentIntentId: intent.id,
      idempotencyKey: intent.idempotencyKey,
      tagId: input.tagId,
      tid: input.tid,
      vehicleRegistration: session.vehicleRegistration,
      amountPaise: input.amountPaise,
      currency: 'INR',
      sessionReference: session.id,
      stationReference: session.stationReference,
      energyWh: input.energyWh,
    });

    const paymentStatus = result.status === 'CAPTURED' ? 'CAPTURED' : result.status === 'FAILED' ? 'FAILED' : 'CREATED';
    const [updated] = await this.database.db.update(paymentIntents).set({
      status: paymentStatus,
      gatewayReference: result.gatewayReference,
      failureReason: result.failureReason,
      rawResponse: result.rawResponse,
      updatedAt: new Date(),
    }).where(eq(paymentIntents.id, intent.id)).returning();

    await this.database.db.update(fastagSessions).set({
      status: result.status === 'CAPTURED' ? 'PAID' : result.status === 'FAILED' ? 'FAILED' : 'SETTLING',
      updatedAt: new Date(),
    }).where(eq(fastagSessions.id, session.id));

    return updated;
  }

  public async getSession(id: string) {
    const [session] = await this.database.db.select().from(fastagSessions)
      .where(eq(fastagSessions.id, id)).limit(1);
    if (!session) throw new NotFoundException('FASTag session not found');
    return session;
  }

  public async getById(id: string) {
    const [intent] = await this.database.db.select().from(paymentIntents)
      .where(eq(paymentIntents.id, id)).limit(1);
    if (!intent) throw new NotFoundException('Payment intent not found');
    return intent;
  }
}
