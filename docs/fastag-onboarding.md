# FASTag / NETC execution plan

## Current boundary

NETC FASTag is not a public wallet API that an independent application can debit. Payment acceptance operates through regulated participants, acquiring banks and approved system integrators. The public NETC material describes toll and parking acceptance; it does not publish a self-service EV-charging merchant API.

The PoC therefore implements the complete internal payment-intent and idempotency boundary using `FASTAG_MODE=mock`. It does not claim that money has moved through NETC.

Official references:

- NPCI NETC overview: <https://www.npci.org.in/product/netc>
- NPCI live NETC member banks: <https://www.npci.org.in/product/netc/all-members>
- IHMCL NETC parking procedural guidelines: <https://ihmcl.co.in/wp-content/uploads/2025/12/NETC_PG_V2.1.pdf>
- IHMCL parking policy: <https://ihmcl.co.in/wp-content/uploads/2025/07/Updated-Parking-Policy.pdf>

## Required commercial/onboarding work

1. Register the company and open the required settlement/nodal account structure.
2. Approach an NPCI NETC acquiring member or a certified NETC system integrator.
3. Present the EV-charging use case and obtain written confirmation that charging-energy payments are permitted under the proposed non-toll merchant model.
4. Agree merchant category, settlement, MDR/fees, refunds, disputes and chargebacks.
5. Determine whether an RFID reader at the charger is mandatory or whether vehicle-registration/manual initiation is permitted.
6. Complete merchant KYC, security assessment, application/API audit and certificate/key exchange.
7. Receive the private sandbox specification, test merchant/plaza identifiers and signed test cases.
8. Implement the selected partner adapter behind `FastagGateway`.
9. Pass certification/UAT, reconciliation and failure/reversal scenarios.
10. Activate production only after legal and compliance approval.

## Partner questions

- Does your approval cover EV charging, not merely parking or FASTag recharge?
- Can a variable post-session amount be captured after energy delivery?
- Is pre-authorization supported, and what is its expiry/reversal behavior?
- How is consent captured when no toll-lane RFID read occurs?
- How are low-balance, blacklisted and exception tags handled?
- What are callback authentication, duplicate detection and reconciliation formats?
- Who bears failed-session and chargeback liability?

## Repository activation gate

`PartnerFastagGateway` intentionally returns `FASTAG_PARTNER_ONBOARDING_REQUIRED`. Replace its implementation only from the selected partner's signed specification. Add partner contract tests and webhook-signature verification before changing `FASTAG_MODE` to `partner`.
