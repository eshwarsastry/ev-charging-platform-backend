export type FastagTagStatus =
  | 'ACTIVE'
  | 'HOTLISTED'
  | 'LOW_BALANCE'
  | 'EXEMPTED'
  | 'BLACKLISTED'
  | 'CLOSED'
  | 'UNREGISTERED'
  | 'UNKNOWN';

export interface FastagTagDetailsRequest {
  tagId: string;
  tid?: string;
  stationReference: string;
}

export interface FastagTagDetailsResult {
  status: FastagTagStatus;
  vehicleRegistration?: string;
  vehicleClass?: string;
  issuerBankId?: string;
  commercialVehicle?: boolean;
  issueDate?: string;
  exceptionCode?: string;
  rawResponse?: Record<string, unknown>;
}

export interface FastagDebitRequest {
  paymentIntentId: string;
  idempotencyKey: string;
  tagId: string;
  tid?: string;
  vehicleRegistration: string;
  amountPaise: number;
  currency: 'INR';
  sessionReference: string;
  stationReference: string;
  energyWh?: number;
}

export interface FastagDebitResult {
  status: 'CAPTURED' | 'PENDING' | 'FAILED';
  gatewayReference?: string;
  failureReason?: string;
  rawResponse?: Record<string, unknown>;
}

export const FASTAG_GATEWAY = Symbol('FASTAG_GATEWAY');

export interface FastagGateway {
  readonly name: string;

  /**
   * Mirrors the NETC EV flow where the acquirer queries the NETC Mapper using
   * Tag ID/TID before the station permits FASTag payment.
   */
  getTagDetails(request: FastagTagDetailsRequest): Promise<FastagTagDetailsResult>;

  /**
   * Submits the final post-session amount for debit. The real partner adapter
   * must map this to the acquiring bank's certified NETC EV Request Pay flow.
   */
  debit(request: FastagDebitRequest): Promise<FastagDebitResult>;
}
