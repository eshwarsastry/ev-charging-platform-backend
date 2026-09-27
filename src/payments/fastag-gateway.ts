export interface FastagAuthorizationRequest {
  paymentIntentId: string;
  idempotencyKey: string;
  vehicleRegistration: string;
  amountPaise: number;
  currency: 'INR';
  sessionReference: string;
}

export interface FastagAuthorizationResult {
  status: 'AUTHORIZED' | 'FAILED';
  gatewayReference?: string;
  failureReason?: string;
  rawResponse?: Record<string, unknown>;
}

export const FASTAG_GATEWAY = Symbol('FASTAG_GATEWAY');

export interface FastagGateway {
  readonly name: string;
  authorize(request: FastagAuthorizationRequest): Promise<FastagAuthorizationResult>;
}
