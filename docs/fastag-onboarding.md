# FASTag / NETC EV charging execution plan

## Target operating model

OHMCharge does not integrate separately with each FASTag issuer bank. It integrates on the NETC acquiring side through an acquiring bank / approved NETC system integrator. NPCI NETC then routes the debit to the FASTag issuer.

The public IHMCL NETC Procedural Guidelines v2.1 define an EV-charging flow in which the acquiring side queries the NETC Mapper using Tag ID/TID, validates the returned tag/vehicle data, and after charging submits the final EV amount using the NETC payment flow with EV merchant semantics.

Official references:

- IHMCL NETC Procedural Guidelines v2.1: <https://ihmcl.co.in/wp-content/uploads/2025/12/NETC_PG_V2.1.pdf>
- NPCI NETC overview: <https://www.npci.org.in/product/netc>
- NPCI NETC member banks: <https://www.npci.org.in/product/netc/all-members>

## What can and cannot be bypassed

### Can be replaced by OHMCharge

- CPO-specific prepaid wallet
- CPO-specific payment app
- separate issuer-bank integrations
- user selection of HDFC/SBI/ICICI/etc.
- duplicate payment onboarding for every charging network

### Cannot be bypassed without the asset owner's permission

- the physical charger
- charger-side RFID reader / certified NETC hardware requirements
- the CPO or site owner's authorization to energize a connector
- meter readings and tariff source
- OCPP/OCPI/private charger-control access
- an NETC acquiring bank / approved processing relationship
- settlement to the charging merchant

This produces two independent planes:

1. **Charging control plane** — OCPP, OCPI commands or a CPO private API starts/stops the EVSE and provides metering.
2. **Payment plane** — OHMCharge sends the FASTag/NETC transaction to its acquirer independent of the CPO's wallet.

## Implemented backend lifecycle

### 1. Tag identification

`POST /v1/payments/fastag/sessions/identify`

Input comes from a trusted charger/edge component after its RFID reader reads Tag ID/TID. The platform asks the configured FASTag gateway for NETC Mapper-style details and stores only a SHA-256 fingerprint of the Tag ID, not the raw tag identifier.

The session records:

- station reference
- mapped VRN
- vehicle class
- issuer bank identifier
- exception code
- NETC tag status
- verification/rejection state

A supplied expected VRN must match the VRN returned by the mapper.

### 2. Charging

The verified FASTag session becomes the payment identity for a charging session. The charger-control integration remains separately responsible for start/stop and metering.

### 3. Final settlement

`POST /v1/payments/fastag/sessions/:id/settle`

After the charger reports the final energy and tariff amount, OHMCharge verifies that the presented tag matches the original fingerprint and sends the final amount to the acquiring gateway. The PoC uses `FASTAG_MODE=mock`; no funds move in mock mode.

## Required commercial/onboarding work

1. Select an NETC acquiring bank or approved NETC system integrator.
2. Onboard OHMCharge / participating charging merchants under the permitted NETC EV model.
3. Obtain the private ICD/API specification, merchant/plaza identifiers, certificates and sandbox credentials.
4. Agree settlement, fees, refunds, disputes, reversals and reconciliation.
5. Certify RFID reader / edge-device requirements for each deployment model.
6. Complete UAT for ACTIVE, low-balance, hotlisted, blacklisted, closed, duplicate, timeout and reversal cases.
7. Replace `PartnerFastagGateway` using the signed partner specification.
8. Keep the payment adapter isolated so the acquiring partner can be changed without rewriting CPO integrations.

## CPO integration requirement

For a third-party charging station, OHMCharge still needs one of:

- OCPI remote-start/session support from the CPO,
- direct OCPP access from the charger owner,
- a CPO private command API,
- or an OHMCharge edge controller deployed with the charger owner's approval.

FASTag can bypass the **vendor wallet**, not ownership/control of the charger.
