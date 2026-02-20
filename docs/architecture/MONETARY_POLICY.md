# ALTAN Monetary Policy
# Валютная Политика INOMAD KHURAL

> Version 1.0 — Foundational Monetary Architecture  
> Last updated: 2026-02-19

---

## 1. Central Bank — Единственный Эмиссионный Орган

The **Central Bank of INOMAD KHURAL** is the sole institution with the authority to:

- **Issue (эмиссия)** ALTAN
- **Burn (сжигание)** ALTAN
- Define and enforce **monetary policy** for the entire confederation

No other institution, bank, arban, or individual may create or destroy ALTAN. The Central Bank operates independently and is accountable to the Khural (parliament) as a whole.

```
Central Bank
└── Sole authority over:
    ├── Primary emission
    ├── Burning (deflation events)
    ├── Treasury accounts
    └── Exchange rate policy
```

---

## 2. Primary Emission — Первичная Эмиссия

### Total Supply

| Parameter | Value |
|-----------|-------|
| **Total primary emission** | **2,100,000,000,000 ALTAN** (2.1 trillion) |
| **Backing equivalent** | ~$2.1 trillion USD |
| **Issuance authority** | Central Bank only |
| **Issuance event** | One-time genesis — at system founding |

> The 2.1 trillion ALTAN represents the total sovereign wealth of the confederation's land and peoples, distributed by birthright — not created by debt.

### Initial State

```
Central Bank Genesis
  → 2,100,000,000,000 ALTAN minted
  → Deposited to: Special Treasury Account (Bank of Siberia)
  → Custodian: Creator (Bair Ivanov) — temporary, during bootstrap phase
```

---

## 3. Treasury Account — Казначейство

The **Bank of Siberia** holds the Special Treasury Account (`treasury:genesis`) on behalf of the confederation.

| Account | Balance | Access |
|---------|---------|--------|
| `treasury:genesis` | 2.1 trillion ALTAN | Creator (bootstrap) → Khural (permanent) |

**Bootstrap Phase:** Managed by the Creator until the Khural governance structures are operational.

**Transition:** Control transfers to a multi-signature Khural vote once ≥ N verified citizens exist (threshold TBD by Khural).

Outflows from the Treasury:
- Birthright distributions to verified citizens
- Land Fund endowment
- UBI reserve
- Public works and institutional allocations

---

## 4. Birthright Distribution — Право по Рождению

Every person has a **sovereign share of ALTAN by right of birth** — not by merit or purchase.

### Distribution Formula

ALTAN is distributed **equally** among:
1. All **indigenous peoples** of the confederation
2. **Citizens residing in indigenous territories** (by Zone of Responsibility)

> Non-indigenous citizens residing in the territory share in the wealth of the land they inhabit — their inclusion reflects the principle that the land supports all who live upon it responsibly.

### Disbursement Trigger

Funds flow from the Treasury to individual accounts when:

```
User registers
  → verificationStatus: DRAFT (no ALTAN)

Guarantor verifies user
  → isVerified = true
  → SYSTEM: transfer birthright share from treasury:genesis to user wallet
  → Amount: defined by Central Bank distribution formula
  → For verified citizens: 100 ALTAN (initial allocation, v1)
  → Full birthright share: calculated based on total supply / eligible population
```

> **v1 simplified model:** 100 ALTAN per verified citizen, drawn from Treasury.  
> **Full model:** Proportional share of 2.1T based on population census — to be implemented as citizen count grows.

### Foreigner Exception

Foreigners (non-citizens without indigenous tie to the land) are **not entitled to the birthright distribution**. They must:
- Purchase ALTAN on the exchange (Валютная Биржа)
- Receive ALTAN transferred from a citizen
- Provide embassy documentation for formal onboarding

---

## 5. Land Rights — Право на Землю

Land rights are a **birthright tied to lineage**, separate from financial holdings.

### Eligibility

| Condition | Land Right |
|-----------|-----------|
| Indigenous citizen, married | **Right to land allocation** from the Land Fund |
| Marriage registered in ZAGS | Triggers land right claim |
| Lineage active (род жив) | Land held in usufruct |
| Lineage extinguished | Land returns to the Land Fund |

### Mechanism

```
Citizen marries (ZAGS registration)
  → Land right claim becomes available
  → Citizen applies to Land Fund (Земельный Фонд)
  → Plot allocated to the family (usufruct — not full ownership)
  → Plot held FOR THE LIFETIME OF THE FAMILY LINE
  → If family line ends → Land returns to the Land Fund
```

> Land is **not owned** in the conventional sense. It is held **in trust** by the family on behalf of the confederation and the indigenous territory it belongs to. The land is the land's — the family is its steward.

### Land Fund

| Account/Entity | Role |
|----------------|------|
| `land-fund:reserve` | Holds unallocated territory |
| ZAGS (`/services/zags`) | Registers marriage, triggers eligibility |
| Land Registry (`/land-registry`) | Records allocations, tracks active stewardships |
| Inheritance Module | Handles succession of land rights to children |

---

## 6. Monetary Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  CENTRAL BANK                                                   │
│  ├── Mints: 2,100,000,000,000 ALTAN (genesis)                  │
│  └── Burns: surplus, penalties (future)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │ genesis transfer
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  BANK OF SIBERIA — Treasury Account (treasury:genesis)          │
│  Custodian: Creator (bootstrap) → Khural (governance)          │
│                                                                 │
│  Outflows:                                                      │
│  ├── +100 ALTAN → verified citizen wallet (on verification)    │
│  ├── UBI reserve → weekly 400 ALTAN to active citizens         │
│  ├── Land Fund endowment                                       │
│  └── Institutional/public works allocations                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
  Citizen Wallets               Land Fund Reserve
  (personal accounts)           (usufruct plots)
          │
          ├── Transfer P2P (citizens ↔ citizens)
          ├── Exchange (ALTAN ↔ external currencies)
          └── Arban credit lines
```

---

## 7. Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Central Bank entity | 🔮 Planned | Needs `CentralBank` role + treasury account |
| Treasury account creation | 🔮 Planned | Special account type in BankAccount model |
| Genesis emission (2.1T) | 🔮 Planned | One-time migration/seed |
| +100 ALTAN on verification | 🔮 Planned | Hook in `verification/verify` service |
| Full birthright distribution | 🔮 Future | Requires census + population formula |
| Land rights (ZAGS trigger) | 🔮 Future | ZAGS ↔ Land Registry integration |
| Foreigner ALTAN rules | 🔮 Planned | Embassy/exchange onboarding flow |
| UBI Scheduler (400/week) | ✅ Implemented | Weekly distribution to active citizens |

---

## 8. Governing Principles

1. **No debt-based money** — ALTAN is issued against sovereign land and people, not debt
2. **Birthright, not merit** — every person's share exists by virtue of being born of this land
3. **Land as stewardship** — families hold land, not own it; it returns to the commons when the line ends
4. **Single issuer** — only the Central Bank may create or destroy ALTAN
5. **Transparent flows** — all Treasury disbursements are auditable by the Khural
