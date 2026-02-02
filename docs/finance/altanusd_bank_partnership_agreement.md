# BANK PARTNERSHIP AGREEMENT
## AltanUSD Reserve Custody & Issuance Services

**DRAFT FOR DISCUSSION PURPOSES**

---

## PARTIES

**CUSTODIAN BANK** ("Bank"):  
[US Bank Name]  
[Address]  
License: [FDIC Certificate Number] / [NY Banking License Number]

**ISSUER**:  
INOMAD INC  
[Delaware Corporation / C-Corp]  
[Address]  
EIN: [Tax ID]

**EFFECTIVE DATE**: [To be determined upon execution]

---

## RECITALS

WHEREAS, Issuer operates the ALTAN blockchain network and wishes to launch a USD-pegged stablecoin ("**AltanUSD**") fully compliant with:
- The **GENIUS Act** (Guiding and Establishing National Innovation for US Stablecoins, 2025)
- **NYDFS Stablecoin Guidance** (New York Department of Financial Services)
- **23 NYCRR Part 500** (Cybersecurity Requirements for Financial Services Companies)

WHEREAS, Bank is a [state/federally] chartered financial institution authorized to provide custodial and trust services;

WHEREAS, the parties wish to establish a partnership whereby Bank will:
1. Custody 100% of USD reserves backing AltanUSD
2. Serve as the exclusive authorized minter of AltanUSD tokens
3. Process redemptions within required timelines

NOW, THEREFORE, in consideration of the mutual covenants herein, the parties agree as follows:

---

## ARTICLE 1: DEFINITIONS

**1.1 AltanUSD**: A digital token on the ALTAN blockchain, redeemable 1:1 for USD.

**1.2 Reserve Account**: A segregated, special-purpose account maintained by Bank, holding 100% of USD reserves backing AltanUSD supply.

**1.3 Authorized Minter**: Bank's designated wallet address `altan1usbankpartner...` (to be finalized), the sole entity authorized to mint new AltanUSD.

**1.4 Redemption**: The process by which an AltanUSD holder converts tokens back to USD.

**1.5 Eligible Assets**: 
- Cash (USD demand deposits in FDIC-insured accounts)
- US Treasury Bills (maturity ≤ 90 days)
- Money market funds (AAA-rated only)

---

## ARTICLE 2: RESERVE CUSTODY OBLIGATIONS

### 2.1 Segregated Account

Bank shall establish and maintain a **Special Purpose Account** ("Reserve Account") that:

(a) **Is legally segregated** from Bank's operational funds and Issuer's corporate accounts;

(b) **Holds only Eligible Assets** totaling no less than 100% of the outstanding AltanUSD supply at all times;

(c) **Cannot be commingled** with any other funds, including:
   - Issuer's operating capital
   - Bank's proprietary assets
   - Other clients' deposits

(d) **Is subject to daily reconciliation** between:
   - Reserve Account USD balance (Bank's ledger)
   - Total AltanUSD supply (on-chain query)

### 2.2 Prohibited Uses (No Rehypothecation)

Bank shall NOT:

(a) Pledge, lend, or use Reserve Account assets as collateral for any purpose;

(b) Engage in securities lending, short selling, or derivatives trading using Reserve Account funds;

(c) Rehypothecate assets in any form;

(d) Withdraw funds except for:
   - **Approved redemptions** (Section 4)
   - **Rebalancing** between Eligible Assets (with Issuer notice)

**PENALTY**: Breach of this section constitutes a material default, entitling Issuer and AltanUSD holders to immediate liquidation rights (Article 9).

### 2.3 Reserve Composition

Bank shall maintain Reserve Account composition as follows:

| Asset Type | Minimum % | Maximum % | Liquidity Requirement |
|------------|-----------|-----------|----------------------|
| **Cash** | 20% | 100% | Immediate (same-day withdrawal) |
| **T-Bills (≤90d)** | 0% | 80% | T+1 settlement |
| **Money Market Funds** | 0% | 30% | T+1 redemption |

**Rebalancing**: Bank may rebalance without Issuer approval if total liquidity remains ≥ 30% cash.

### 2.4 Reserve Oracle Integration

Bank shall provide **real-time API access** to Reserve Account balance:

```yaml
API Endpoint: https://bank-api.example/altanusd/reserve

Required Data:
  - reserve_balance_usd: Total USD value
  - cash_usd: Cash holdings
  - tbills_usd: Treasury bills market value
  - mmf_usd: Money market fund value
  - last_updated: ISO 8601 timestamp
  
Update Frequency: Every 60 minutes
Uptime SLA: 99.9%
```

This data feeds the on-chain **Reserve Oracle** for mint authorization.

---

## ARTICLE 3: EXCLUSIVE MINT AUTHORITY

### 3.1 Authorization

Bank is granted **exclusive authority** to mint new AltanUSD tokens under the following conditions:

(a) **USD Receipt Verification**: Bank has received and cleared USD funds into the Reserve Account via:
   - Incoming wire transfer
   - ACH deposit
   - Check (after clearing period)

(b) **Reserve Adequacy Test**: 
   ```
   Reserve Account Balance ≥ (Current AltanUSD Supply + Mint Amount)
   ```

(c) **AML/KYC Compliance**: The depositor has passed Bank's anti-money laundering and know-your-customer checks.

### 3.2 Mint Process

```
Step 1: Customer (Alice) wires $10,000 to Reserve Account
        Wire reference: "AltanUSD mint for wallet altan1alice..."

Step 2: Bank verifies:
        ✅ Funds cleared
        ✅ AML/KYC passed
        ✅ Reserve balance sufficient

Step 3: Bank calls ALTAN blockchain API:
        POST /mint
        {
          "amount": "10000000000",  // 10,000 AltanUSD (6 decimals)
          "recipient": "altan1alice...",
          "wire_ref": "WIRE-2026-01-31-00123",
          "timestamp": "2026-01-31T14:30:00Z",
          "signature": "0x..."  // Bank's private key signature
        }

Step 4: ALTAN blockchain verifies:
        ✅ Signature from authorized minter
        ✅ Reserve oracle confirms balance
        ✅ No sanctions flags

Step 5: Mint 10,000 AltanUSD to Alice's wallet
        Event logged on-chain for audit
```

**Timeline**: Bank shall complete mint within **4 business hours** of USD fund clearance.

### 3.3 Blockchain Fees

**IMPORTANT**: There are **NO blockchain fees** for minting AltanUSD.

The mint operation is free at the protocol level. Bank may charge separate banking service fees (see Article 7) for their services (wire processing, KYC, compliance), but these are **off-chain** charges, not deducted from the blockchain mint.

---

## ARTICLE 4: REDEMPTION OBLIGATIONS

### 4.1 Right to Redeem

Every AltanUSD holder has an **unconditional right** to redeem tokens for USD at a 1:1 ratio.

### 4.2 Redemption Process

```
Step 1: User (Bob) submits redemption request via ALTAN blockchain
        Amount: 5,000 AltanUSD
        Bank account: [Bob's verified bank account]

Step 2: Blockchain locks tokens in escrow smart contract

Step 3: Blockchain sends webhook to Bank API
        POST /redeem
        {
          "request_id": "REDEEM-2026-001",
          "holder": "altan1bob...",
          "amount": "5000000000",
          "bank_account_iban": "US12345...",
          "timestamp": "2026-01-31T16:00:00Z"
        }

Step 4: Bank verifies:
        ✅ Tokens locked on-chain
        ✅ Bank account ownership (KYC match)
        ✅ No sanctions flags

Step 5: Bank initiates wire transfer for $5,000 USD

Step 6: Bank confirms completion on blockchain
        POST /redeem/complete
        {
          "request_id": "REDEEM-2026-001",
          "wire_ref": "WIRE-OUT-2026-123",
          "completion_time": "2026-02-02T10:15:00Z"
        }

Step 7: Blockchain burns 5,000 AltanUSD from escrow
```

### 4.3 Timeline SLA (CRITICAL)

Bank SHALL complete redemptions within **48 hours (2 business days)** from request submission, excluding:
- Federal holidays
- Bank processing cutoff times (after 3PM ET = next business day)

**Penalty for Delay**:
- Days 3-5: Bank pays 0.1%/day penalty to holder
- Day 6+: Breach of contract, regulatory report required

**Force Majeure**: Extended timelines permitted only for:
- Federal government closure
- Court-ordered freeze
- Natural disaster affecting banking infrastructure

### 4.4 Blockchain Fees

**IMPORTANT**: There are **NO blockchain fees** for redeeming (burning) AltanUSD.

The redemption smart contract operation is free at the protocol level. Bank may charge separate wire transfer fees for USD payout (see Article 7), but these are **off-chain** banking charges, not blockchain protocol fees.

---

## ARTICLE 5: COMPLIANCE & CYBERSECURITY

### 5.1 NYDFS 23 NYCRR Part 500

Bank acknowledges that AltanUSD operations are subject to **23 NYCRR Part 500** and Bank shall:

(a) **Multi-Factor Authentication**: Require MFA for all administrative access to mint/redeem systems;

(b) **Cybersecurity Program**: Maintain NYDFS-compliant cybersecurity policies, including:
   - Annual penetration testing
   - Incident response plan
   - Data encryption (at rest and in transit)
   - Access controls and audit logs

(c) **Insurance**: Maintain cybersecurity insurance coverage of at least **$10 million USD** with Issuer as additional insured.

### 5.2 AML/KYC (Bank Secrecy Act)

Bank shall perform **enhanced due diligence** for:
- Mint transactions > $10,000 (Currency Transaction Report)
- Redemptions > $10,000
- Suspicious activity (file SARs with FinCEN)

Bank shall screen all counterparties against:
- **OFAC** (Office of Foreign Assets Control) sanctions lists
- **UN Security Council** sanctions
- **EU** sanctions (if applicable)

### 5.3 Data Sharing for Compliance

Bank shall provide Issuer with:
- **Monthly reports**: All mints, burns, and flagged transactions
- **Quarterly attestations**: Confirmation of reserve balance and AML compliance
- **On-demand access**: During regulatory audits or investigations

**Confidentiality**: Issuer shall keep this data confidential except for:
- Regulatory disclosure
- Law enforcement requests
- Public reserve dashboard (aggregated data only, no PII)

---

## ARTICLE 6: AUDITING & TRANSPARENCY

### 6.1 Monthly Attestations

Bank shall engage a **Big 4 accounting firm** (PwC, Deloitte, EY, or KPMG) to provide **monthly attestation reports** confirming:

(a) Reserve Account balance ≥ 100% of AltanUSD supply;

(b) Composition of reserves (cash, T-bills, MMF percentages);

(c) Reconciliation between Bank ledger and on-chain supply;

(d) No unauthorized withdrawals or rehypothecation.

**Delivery**: Within **10 calendar days** after month-end.

**Cost**: Split 50/50 between Bank and Issuer.

**Public Disclosure**: Attestation summary published at https://altan.network/reserves (full report available upon request).

### 6.2 Real-Time Dashboard

Bank's Reserve Oracle API (Section 2.4) feeds a **public transparency dashboard** displaying:
- Total AltanUSD supply
- Reserve balance (USD)
- Collateralization ratio (target: ≥ 100%)
- Latest attestation date and status

**Uptime SLA**: 99.9% annually.

### 6.3 Regulatory Reporting

Bank shall timely file all required reports with:
- **NYDFS** (if NY-chartered or BitLicense holder)
- **OCC** (if federally chartered)
- **FinCEN** (CTRs, SARs)
- **SEC** (if stablecoin classified as security)

Issuer shall cooperate with all regulatory inquiries.

---

## ARTICLE 7: FEES & REVENUE MODEL

### 7.1 Blockchain Protocol Fees (INOMAD INC Revenue)

**Network Fee on AltanUSD Transfers**:
```yaml
Fee: 0.03% of transfer amount
Cap: 1000 ALTAN maximum commission
Gas Fee: Separate, no cap (spam protection)

Applies to: ONLY transfers between wallets
Does NOT apply to: Mint or Burn operations

Example Transfer:
  Alice sends 100,000 AltanUSD → Bob
  Network fee: 100,000 × 0.03% = 30 AltanUSD
  Bob receives: 100,000 AltanUSD
  INOMAD receives: 30 AltanUSD
  
Recipient: INOMAD INC treasury (protocol maintenance)
```

**Projected Annual Revenue** (at $500M AltanUSD supply, 10x transfer velocity):
```
Transfer volume: $5 Billion/year
Revenue: $5B × 0.03% = $1.5M/year to INOMAD INC
```

---

### 7.2 Bank Service Fees (Off-Chain)

Bank may charge the following **banking service fees** (NOT blockchain fees):

#### 7.2.1 Bid-Ask Spread
```yaml
When customers buy/sell AltanUSD through Bank:
  Bank Buy Price: $1.0000 (Bank buys AltanUSD from customer)
  Bank Sell Price: $1.0015 (Bank sells AltanUSD to customer)
  Spread: ~0.10% - 0.20% (flexible, set by Bank)

Example:
  Customer wants 10,000 AltanUSD
  Wire to Bank: $10,015 USD
  Bank keeps: $15 (spread)
  Mints to customer: 10,000 AltanUSD (no blockchain fee)
```

#### 7.2.2 Wire Transfer Fees
```yaml
Incoming Wire (USD → Reserve): $15-25 per wire
Outgoing Wire (Redemption): $15-25 per wire

Recipient: Bank (standard banking fee)
```

#### 7.2.3 Custody Fee
```yaml
Fee: 0.02% annually on Reserve Account balance
Paid by: Issuer (INOMAD INC)
Paid to: Bank

Example:
  Reserve: $500M
  Annual fee: $500M × 0.02% = $100,000/year
```

#### 7.2.4 Volume Discounts (Optional)
```yaml
Bank may offer reduced spread for:
  - High-volume customers (>$100K/month)
  - Institutional clients
  - Market makers

Example tiers:
  Retail: 0.15% spread
  Mid-tier (>$100K): 0.10% spread  
  Institutional (>$1M): 0.05% spread
```

---

### 7.3 Other Shared Costs

| Service | Cost | Split |
|---------|------|-------|
| **Monthly CPA Attestation** | $5,000/month | 50% Bank / 50% Issuer |
| **Annual Smart Contract Audit** | $50,000 | 100% Issuer |
| **Cybersecurity Insurance** | $25,000/year | 100% Bank |

---

### 7.4 Revenue Projections (Year 3, $500M Supply)

**INOMAD INC**:
```
Network fees (0.03%): $1.5M/year
```

**Bank**:
```
Bid-ask spread revenue:
  Annual volume: $3.5B (mint + redeem)
  Avg spread: 0.15%
  Revenue: $5.25M/year
  
Wire transfer fees:
  ~50,000 transactions/year × $20 = $1M/year
  
Custody fee:
  $500M × 0.02% = $100K/year

Total Bank Revenue: ~$6.35M/year
```

**IMPORTANT**: Bank revenue is from **banking services**, not blockchain protocol fees. This allows Bank to:
- Compete on pricing (adjust spread)
- Offer volume discounts
- Bundle services (e.g., free wires for large accounts)

---

### 7.5 Payment & Settlement

- **Network fees (0.03%)**: Automatically deducted on-chain during transfers
- **Custody fee**: Invoiced monthly by Bank to Issuer, payable within 15 days
- **Attestation costs**: Invoiced by auditor, split payment by both parties
- **Spread & wire fees**: Collected by Bank directly from customers (off-chain)

---

## ARTICLE 8: LIABILITY & INDEMNIFICATION

### 8.1 Bank's Liability

Bank shall be liable for:

(a) **Unauthorized use of Reserve** (e.g., rehypothecation, unapproved withdrawals);

(b) **Failure to meet redemption SLA** (48-hour timeline);

(c) **Cybersecurity breach** resulting in loss of Reserve Account funds;

(d) **Negligence or willful misconduct** in custody duties.

**Limitation**: Bank's liability capped at **$50 million USD** per incident, except for gross negligence or fraud (unlimited liability).

### 8.2 Issuer's Liability

Issuer shall be liable for:

(a) **Smart contract bugs** causing incorrect mints/burns;

(b) **Blockchain downtime** preventing redemption requests;

(c) **Misrepresentation** of reserve status to users.

**Limitation**: Issuer's liability capped at **$25 million USD** per incident.

### 8.3 Mutual Indemnification

Each party shall indemnify the other against:
- Third-party lawsuits arising from breach of this Agreement
- Regulatory fines due to non-compliance by indemnifying party
- Losses from fraud or willful misconduct

**Process**: Indemnified party must notify indemnifying party within 10 days of claim.

---

## ARTICLE 9: PRIORITY CLAIMS & LIQUIDATION

### 9.1 Trust Structure (Optional but Recommended)

Parties agree to establish an **AltanUSD Reserve Trust** with:

- **Trustee**: Bank (or third-party licensed trust company)
- **Beneficiaries**: All AltanUSD holders (pro-rata)
- **Purpose**: Ring-fence Reserve Account from Issuer's bankruptcy estate

**Effect**: If Issuer becomes insolvent, Reserve Account is **not** part of Issuer's bankruptcy estate and cannot be seized by Issuer's creditors.

### 9.2 Priority Waterfall

In the event of liquidation (voluntary or involuntary):

```
Priority 1: AltanUSD Holders
  - Pro-rata distribution based on token holdings
  - Example: If Reserve = $98M and Supply = $100M, each holder gets $0.98 per token

Priority 2: Trust Administrative Costs
  - Legal fees, trustee fees, liquidation expenses

Priority 3: Issuer
  - Any residual funds (if reserve exceeded 100%)
```

**No Claims Against Reserve**: Bank's creditors have NO claim on Reserve Account funds.

### 9.3 Liquidation Trigger Events

Liquidation may be triggered by:

(a) **Court order** (bankruptcy, receivership);

(b) **Regulatory action** (NYDFS cease-and-desist);

(c) **Material breach** of this Agreement (after 30-day cure period);

(d) **Consent of both parties**.

**Process**: Upon trigger, Trustee shall:
1. Freeze all mints/redeems
2. Liquidate T-bills and MMF to cash
3. Publish notice to all AltanUSD holders (on-chain and email)
4. Distribute cash pro-rata within 90 days

---

## ARTICLE 10: TERM & TERMINATION

### 10.1 Initial Term

This Agreement shall commence on the Effective Date and continue for an initial term of **3 years**.

### 10.2 Renewal

Auto-renews for successive 1-year terms unless either party provides **180 days' written notice** of non-renewal.

### 10.3 Termination for Cause

Either party may terminate immediately upon:

(a) Material breach by the other party (after 30-day cure period);

(b) Bankruptcy, insolvency, or receivership of the other party;

(c) Loss of regulatory license (Bank's banking license or Issuer's BitLicense);

(d) Violation of law resulting in criminal charges.

### 10.4 Wind-Down Procedure

Upon termination:

1. **Immediate halt to new mints** (no new AltanUSD issued);

2. **Redemptions continue** for existing holders (Bank must honor for 1 year);

3. **Select successor bank** (if Issuer wishes to continue AltanUSD with new partner);

4. **Final attestation** within 30 days of termination date;

5. **Return excess reserves** to Issuer (if any remain after all redemptions).

---

## ARTICLE 11: DISPUTE RESOLUTION

### 11.1 Governing Law

This Agreement shall be governed by the laws of the **State of New York**, without regard to conflicts of law principles.

### 11.2 Arbitration

Any dispute shall be resolved through **binding arbitration** under AAA Commercial Arbitration Rules:

- **Venue**: New York City
- **Arbitrators**: Panel of 3 (each party selects 1, those 2 select the 3rd)
- **Discovery**: Limited to relevant documents only
- **Appeal**: Final decision (no appeal except for fraud)

**Exception**: Either party may seek injunctive relief in court for:
- Breach of confidentiality
- Unauthorized use of Reserve Account
- Violation of regulatory requirements

### 11.3 Legal Costs

Prevailing party shall recover reasonable attorney's fees and costs.

---

## ARTICLE 12: MISCELLANEOUS

### 12.1 Amendments

This Agreement may be amended only by **written consent of both parties**.

**Regulatory Amendments**: If required by law or regulator, parties shall negotiate amendments in good faith within 60 days.

### 12.2 Assignment

Neither party may assign this Agreement without the other's written consent, except:
- Issuer may assign to a wholly-owned subsidiary
- Bank may assign to a successor institution following merger

### 12.3 Notices

All notices shall be sent to:

**Bank**:  
[Legal Department]  
[Address]  
[Email]

**Issuer**:  
Bair Ivanov, CEO  
INOMAD INC  
[Address]  
[Email]

**Method**: Email (with read receipt) or certified mail.

### 12.4 Entire Agreement

This Agreement, together with attached schedules, constitutes the entire understanding between the parties.

### 12.5 Severability

If any provision is found invalid, the remainder of the Agreement remains in effect.

---

## SIGNATURES

**CUSTODIAN BANK:**

By: ____________________________  
Name: [Authorized Signatory]  
Title: [Chief Compliance Officer / General Counsel]  
Date: __________________________

**INOMAD INC:**

By: ____________________________  
Name: Bair Ivanov  
Title: Chief Executive Officer & Founder  
Date: __________________________

---

## SCHEDULES

### Schedule A: Technical Integration Specifications
- API documentation
- Webhook endpoints
- Security protocols (TLS 1.3, API keys, rate limits)
- Disaster recovery procedures

### Schedule B: AML/KYC Procedures
- Enhanced due diligence thresholds
- Document requirements
- Sanctions screening methodology
- SAR filing process

### Schedule C: Reserve Account Details
- Account number (redacted in public version)
- SWIFT/ABA routing information
- Authorized signatories
- Wire transfer instructions

### Schedule D: Attestation Report Template
- Required disclosures
- Auditor certification language
- Publication format

---

**CONFIDENTIAL - FOR DISCUSSION WITH PROSPECTIVE BANK PARTNERS**

**Document Version**: 1.0 DRAFT  
**Prepared By**: INOMAD INC Legal Department  
**Date**: January 31, 2026  
**Next Review**: Upon bank selection
