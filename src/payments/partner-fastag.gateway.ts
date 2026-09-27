import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  FastagDebitResult,
  FastagGateway,
  FastagTagDetailsResult,
} from './fastag-gateway';

/**
 * The public IHMCL procedural guidelines define the NETC EV flow, but the
 * acquiring-bank API/ICD contract, certificates, merchant/plaza identifiers and
 * sandbox endpoints are partner-controlled. We deliberately do not invent
 * request paths or payloads here.
 *
 * Replace this adapter only after an acquiring bank / approved NETC system
 * integrator supplies its signed technical specification and certification
 * test pack.
 */
@Injectable()
export class PartnerFastagGateway implements FastagGateway {
  public readonly name = 'netc-fastag-partner';

  public getTagDetails(): Promise<FastagTagDetailsResult> {
    throw this.onboardingRequired();
  }

  public debit(): Promise<FastagDebitResult> {
    throw this.onboardingRequired();
  }

  private onboardingRequired(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      code: 'FASTAG_PARTNER_ONBOARDING_REQUIRED',
      message:
        'NETC EV partner mode requires acquiring-bank onboarding, private ICD/API specs, certificates and sandbox approval',
    });
  }
}
