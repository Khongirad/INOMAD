# Registration & Onboarding Specification

> Version 2.0 — Registration Ceremony Redesign  
> Last updated: 2026-02-19

## Overview

The INOMAD KHURAL registration process is a **sovereign ceremony** that transforms a visitor into a legal subject of the system. It consists of three distinct phases:

1. **Registration Ceremony** — legal commitments + account creation
2. **Citizen Verification (Activation)** — chain of trust establishment
3. **Digital Shell Creation (Profile)** — demographic identity

## Citizen Number System

Every registered user receives a **random 13-digit citizen number** — unique and non-sequential:

| Citizen | Number |
|---------|--------|
| Creator (Bair Ivanov) | `0000000000001` (fixed) |
| All others | Random 13-digit (e.g. `4829103756281`) |

> Numbers are intentionally **non-sequential** to prevent outsiders from estimating the total citizen count.

The citizen number is permanent, assigned automatically on registration, and never changes.

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 1: REGISTRATION CEREMONY (no account)                 │
│                                                              │
│  Step 1: Terms of Service      → read + accept checkbox      │
│  Step 2: Constitution          → read + accept checkbox      │
│  Step 3: Sacred Oath           → "⚔️ I SWEAR" button        │
│  Step 4: Account Creation      → username + password         │
│          Password: ≥8 chars, must have letters AND numbers   │
│                                                              │
│  Backend calls:                                              │
│    POST /auth/register  → creates user, returns JWT          │
│    POST /auth/accept-tos → hasAcceptedTOS = true             │
│    POST /auth/accept-constitution → isLegalSubject = true    │
│                                                              │
│  → redirect to /activation                                   │
├──────────────────────────────────────────────────────────────┤
│  PHASE 2: ACTIVATION — Guarantor System                      │
│                                                              │
│  /activation page (MANDATORY — no skip):                     │
│                                                              │
│  Mode A: "I know a verified citizen"                         │
│  • Enter guarantor's SeatID                                  │
│  • POST /verification/request-by-seat                        │
│  • Shows guarantor's username for confirmation               │
│  • Wait for guarantor to verify from their dashboard         │
│                                                              │
│  Mode B: "I need to find a guarantor"                        │
│  • Shows user's own SeatID with copy button                  │
│  • User shares SeatID externally with a verified citizen     │
│                                                              │
│  Both modes: poll GET /users/me every 10s for verifiedAt     │
│  On verification: show guarantor name → /profile/create      │
│                                                              │
│  ⚖️ The guarantor is PERSONALLY RESPONSIBLE                  │
│     for the person they verify.                              │
├───────────────────────────────────────────────────────
│  PHASE 3: DIGITAL SHELL CREATION (logged in, verified)       │
│                                                              │
│  /profile/create page:                                       │
│  • Birthplace (country, region, city)                        │
│  • Date of birth, Gender                                     │
│  • Indigenous / Resident status                              │
│  • Ethnicity (multi-select)                                  │
│  • Clan / lineage (dynamic by ethnicity)                     │
│  • Language (dropdown)                                       │
│                                                              │
│  Backend: PATCH /users/profile                               │
│  → redirect to /dashboard                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Phase 1: Registration

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/auth/register` | Public | Create account (username + password) |
| `POST` | `/auth/accept-tos` | JWT | Record TOS acceptance |
| `POST` | `/auth/accept-constitution` | JWT | Become legal subject |

**Password requirements:** ≥ 8 characters, must contain both letters and numbers.

**`POST /auth/register`** request:
```json
{
  "username": "baatar_1990",
  "password": "SecureP4ss!"
}
```

Response (201):
```json
{
  "ok": true,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "userId": "uuid",
    "seatId": "SEAT-XXXXX",
    "username": "baatar_1990",
    "role": "CITIZEN",
    "hasAcceptedTOS": false,
    "hasAcceptedConstitution": false,
    "isLegalSubject": false
  }
}
```

### Phase 2: Activation (Guarantor System)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/verification/request-by-seat` | JWT | Send verification request to guarantor |
| `GET` | `/verification/my-guarantor` | JWT | Get who verified you |
| `GET` | `/users/me` | JWT | Get profile (check `verifiedAt`) |
| `POST` | `/verification/verify/:userId` | JWT | Verify a user (guarantor's action) |

**`POST /verification/request-by-seat`** request:
```json
{
  "guarantorSeatId": "SEAT-AB12C"
}
```

Response:
```json
{
  "ok": true,
  "guarantor": { "username": "baatar", "seatId": "SEAT-AB12C" },
  "message": "Verification request sent."
}
```

### Phase 3: Profile

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `PATCH` | `/users/profile` | JWT | Save demographic data |

**`PATCH /users/profile`** request:
```json
{
  "gender": "male",
  "dateOfBirth": "1990-03-15",
  "ethnicity": ["Buryad-Mongol"],
  "birthPlace": {
    "country": "Russia",
    "district": "Republic of Buryatia",
    "city": "Ulan-Ude"
  },
  "clan": "Khori",
  "nationality": "Buryad-Mongol",
  "language": "Buryad"
}
```

---

## Database State Transitions

```
Registration:
  hasAcceptedTOS:          false → true    (accept-tos)
  hasAcceptedConstitution: false → true    (accept-constitution)
  isLegalSubject:          false → true    (accept-constitution)
  verificationStatus:      DRAFT

Activation:
  isVerified:              false → true    (verification/verify)
  verifiedAt:              null  → Date    (verification/verify)

Profile:
  ethnicity:               []    → [...]   (PATCH /users/profile)
  birthPlace:              null  → {...}
  language:                null  → "..."
```

---

## Frontend Routes

| Route | Layout | Purpose |
|-------|--------|---------|
| `/gates/register` | `(auth)` | Registration ceremony (no sidebar) |
| `/activation` | `(app)` | Verification waiting room |
| `/profile/create` | `(app)` | Demographic data entry |
| `/dashboard` | `(app)` | Main dashboard (post-onboarding) |

---

## Verification Chain Philosophy

Every citizen forms part of a **chain of trust** rooted at the Creator (founder). When citizen A verifies citizen B:

- A is **personally responsible** for B's identity
- A's verification count increments (max 5 by default)
- B's `verifiedAt` is set, unlocking profile creation
- The chain is permanently recorded and auditable via `GET /verification/chain/:userId`

This ensures no anonymous participation — every member is interconnected and accountable.

---

## Verification Types by Subject

| Subject | Verification Path | Status |
|---------|------------------|--------|
| **Citizen** (гражданин) | Via another verified citizen (guarantor / поручитель) | ✅ Implemented |
| **Foreigner** (иностранец) | Via Migration Service, Embassy invitation, or direct application | 🔮 Future |

### Citizen Verification (current)

A citizen is verified by another citizen who acts as **поручитель** (guarantor). The guarantor bears personal responsibility for the identity of the person they verify.

### Foreigner Verification (planned)

Foreigners will be verified through:
1. **Migration Service** — official government service for foreign nationals
2. **Invitation** — a citizen or organization sends a formal invitation, processed through the Migration Service
3. **Embassy** — direct application through an INOMAD KHURAL embassy or consulate

> This will be implemented when the Migration Service (`/services/migration`) is fully operational.

---

## Tax & Registration Numbers

Upon tax registration, subjects receive identification numbers with different visibility rules:

### Individuals (физические лица)

| Field | Visibility | Description |
|-------|-----------|-------------|
| **TIN** (Taxpayer ID) | 🔒 **Private** | Analog of **SSN** (Social Security Number). Visible only to the individual and authorized government services (Tax Service, ZAGS, courts). Never publicly accessible. |

### Legal Entities (юридические лица)

| Field | Visibility | Description |
|-------|-----------|-------------|
| **TIN** (Tax ID) | 🌐 **Public** | Tax identification number, publicly searchable in the registry |
| **Registration Number** | 🌐 **Public** | Official registration number assigned at incorporation, publicly accessible |

> Both organizational numbers must be publicly available for transparency and accountability.
> Individual TIN is strictly confidential — exposure constitutes a legal violation.

---

## Password Recovery — Social Trust Model

INOMAD KHURAL has **no email-based password reset**. Recovery is done through the **chain of trust**.

### Option A — Via Guarantor (Верификатор)
The user contacts the citizen who originally verified them (поручитель). The guarantor raises a recovery request through the system, which an admin or the system processes to issue a new password or recovery token.

### Option B — Via Arban (if established)
If the user is already a member of an Arban and has trusted members there, the Arban can collectively initiate a recovery request. This requires a quorum — e.g. ≥ 3 Arban members confirming the identity of the requester.

> **Rationale:** There is no anonymous recovery. Every citizen is embedded in a chain of social accountability. Your identity is guaranteed by real people — and recovery goes through those same people.

| Scenario | Recovery Path | Status |
|----------|--------------|--------|
| Has guarantor | Contact guarantor → raise recovery request | 🔮 Planned |
| Has Arban with members | Arban quorum recovery | 🔮 Planned |
| No social connections yet | Contact system admin (bootstrap only) | ⚠️ Manual fallback |

---

## Wallet — Bank of Siberia

Every citizen has a **personal sovereign account** in the Bank of Siberia, cryptographically tied to their identity via MPC wallet.

### Citizen Onboarding Bonus

| Condition | Action |
|-----------|--------|
| Registered AND verified citizen | **+100 ALTAN** credited automatically on wallet creation |
| Not yet verified (DRAFT status) | No bonus — must be activated first |

> The 100 ALTAN bonus is a **sovereign welcome gift** — recognition of legal subject status in the Khural.

### Foreigner Wallet Rules

Foreigners registered in the system (non-indigenous citizens or foreign nationals) do **not** receive the 100 ALTAN bonus. Instead, they must fund their account through one of:

1. **Purchase on the Exchange** — buy ALTAN with external currency via the Валютная Биржа (Currency Exchange)
2. **Transfer from a Citizen** — an existing citizen transfers ALTAN to the foreigner's account (peer-to-peer)
3. **Embassy Documentation** — provide verified documents from an INOMAD KHURAL embassy or consulate as part of formal onboarding

> **Rationale:** ALTAN is not fiat — it has sovereign backing. Citizens earn it through their relationship to the land. Foreigners must either acquire it on the open market or receive it from a citizen who vouches for them.

### Wallet Creation Flow

```
POST /auth/register
  → Account created (verificationStatus: DRAFT)
  → Wallet PIN set by user
  → MPC wallet generated (no ALTAN yet)

POST /verification/verify/:userId   ← guarantor action
  → verifiedAt set
  → isVerified = true
  → SYSTEM triggers: +100 ALTAN credited to wallet  ← 🔮 to implement
```

### Key Services

| Service | Purpose |
|---------|---------|
| **Bank of Siberia** (`/bank`) | Personal accounts, ALTAN balance, transfers |
| **Currency Exchange** (`/exchange`) | Buy/sell ALTAN with external currencies |
| **Arban Credit Line** | Arban-based micro-credit in ALTAN |
| **UBI Scheduler** | Weekly 400 ALTAN distribution to active verified citizens |
