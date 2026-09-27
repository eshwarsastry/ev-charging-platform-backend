import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { FastagAuthorizationResult, FastagGateway } from './fastag-gateway';

/**
 * Deliberately blocked until the selected acquiring bank / certified NETC system integrator
 * supplies its contract, endpoint specification, certificate exchange and sandbox approval.
 * Inventing an unofficial NETC endpoint would be unsafe for a payment system.
 */
@Injectable()
export class PartnerFastagGateway implements FastagGateway {
  public readonly name = 'netc-fastag-partner';

  public authorize(): Promise<FastagAuthorizationResult> {
    throw new ServiceUnavailableException({
      code: 'FASTAG_PARTNER_ONBOARDING_REQUIRED',
      message:
        'Partner-mode FASTag authorization requires an acquiring-bank or certified NETC SI contract and sandbox specification',
    });
  }
}
