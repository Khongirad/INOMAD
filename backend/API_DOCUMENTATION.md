# API Endpoints Documentation: Two-Type Arban System

Complete REST API documentation for the Arban system backend.

---

## Base URL
```
http://localhost:3000/arbans
```

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## 1. Family Arban API

### POST `/arbans/family/marriage`
Register marriage and create Family Arban.

**Request:**
```json
{
  "husbandSeatId": 123,
  "wifeSeatId": 456
}
```

**Response (201):**
```json
{
  "arbanId": 1,
  "txHash": "0x..."
}
```

---

### POST `/arbans/family/:arbanId/children`
Add child to Family Arban.

**Request:**
```json
{
  "childSeatId": 789
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Child added successfully"
}
```

---

### PUT `/arbans/family/:arbanId/heir`
Change heir to another child.

**Request:**
```json
{
  "newHeirSeatId": 789
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Heir changed successfully"
}
```

---

### POST `/arbans/family/:arbanId/khural-rep`
Set Khural representative (husband or wife, under 60 years old).

**Request:**
```json
{
  "repSeatId": 123,
  "birthYear": 1985
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Khural representative set successfully"
}
```

---

### GET `/arbans/family/khural-reps`
Get all Khural representatives.

**Response (200):**
```json
[
  {
    "seatId": 123,
    "arbanId": 1,
    "birthYear": 1985,
    "age": 41,
    "assignedAt": "2024-01-15T10:30:00Z"
  }
]
```

---

### GET `/arbans/family/:arbanId`
Get Family Arban by ID.

**Response (200):**
```json
{
  "arbanId": 1,
  "husbandSeatId": 123,
  "wifeSeatId": 456,
  "childrenSeatIds": [789, 790],
  "heirSeatId": 790,
  "zunId": 5,
  "khuralRepSeatId": 123,
  "khuralRepBirthYear": 1985,
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### GET `/arbans/family/by-seat/:seatId`
Get Family Arban by seat ID (husband, wife, or child).

---

### GET `/arbans/family/:arbanId/khural-eligible`
Check if Family Arban is Khural eligible.

**Response (200):**
```json
{
  "arbanId": 1,
  "eligible": true
}
```

---

### POST `/arbans/family/:arbanId/sync`
Sync Family Arban from blockchain.

---

## 2. Zun (Clan) API

### POST `/arbans/zun`
Form Zun (clan) from Family Arbans.

**Request:**
```json
{
  "zunName": "Golden Horde",
  "arbanIds": [1, 2, 3, 4, 5]
}
```

**Response (201):**
```json
{
  "zunId": 1,
  "txHash": "0x..."
}
```

---

### PUT `/arbans/zun/:zunId/elder`
Set Zun elder.

**Request:**
```json
{
  "elderSeatId": 123
}
```

---

### GET `/arbans/zun/:zunId`
Get Zun by ID.

**Response (200):**
```json
{
  "zunId": 1,
  "name": "Golden Horde",
  "founderArbanId": 1,
  "memberArbanIds": [1, 2, 3, 4, 5],
  "elderSeatId": 123,
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### GET `/arbans/zun/by-family/:arbanId`
Get Zuns by Family Arban ID.

---

### POST `/arbans/zun/:zunId/sync`
Sync Zun from blockchain.

---

## 3. Organizational Arban API

### POST `/arbans/org`
Create Organizational Arban.

**Request:**
```json
{
  "name": "Central Bank of Siberia",
  "orgType": 3
}
```

**Org Types:**
- `0` - NONE
- `1` - EXECUTIVE (Government, President)
- `2` - JUDICIAL (Courts)
- `3` - BANKING (Central Bank, commercial banks)
- `4` - PRIVATE_COMPANY
- `5` - STATE_COMPANY
- `6` - GUILD (Professional guilds)
- `7` - SCIENTIFIC_COUNCIL (Temple of Heaven, Education)
- `8` - EKHE_KHURAL (Big Khural - confederation coordination)

**Response (201):**
```json
{
  "arbanId": 100,
  "txHash": "0x..."
}
```

---

### POST `/arbans/org/:arbanId/members`
Add member to organization.

**Request:**
```json
{
  "seatId": 789
}
```

---

### PUT `/arbans/org/:arbanId/leader`
Set organization leader.

**Request:**
```json
{
  "leaderSeatId": 123
}
```

---

### POST `/arbans/org/:parentOrgId/departments`
Create department under parent organization.

**Request:**
```json
{
  "deptName": "Monetary Policy Department"
}
```

**Response (201):**
```json
{
  "arbanId": 101,
  "txHash": "0x..."
}
```

---

### GET `/arbans/org/:arbanId`
Get Organizational Arban by ID.

**Response (200):**
```json
{
  "arbanId": 100,
  "name": "Central Bank of Siberia",
  "memberSeatIds": [123, 456, 789],
  "leaderSeatId": 123,
  "orgType": 3,
  "powerBranch": 4,
  "parentOrgId": 0,
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### GET `/arbans/org?type=BANKING`
Get organizations by type.

**Query Parameters:**
- `type`: EXECUTIVE, JUDICIAL, BANKING, GUILD, SCIENTIFIC_COUNCIL, EKHE_KHURAL, etc.

---

## 4. Credit System API

### Family Credit

#### POST `/arbans/credit/family/:arbanId/open`
Open Family credit line.

**Response (201):**
```json
{
  "arbanId": 1,
  "creditType": 1,
  "creditRating": 500,
  "creditLimit": "25000",
  "borrowed": "0",
  "available": "25000",
  "totalBorrowed": "0",
  "totalRepaid": "0",
  "defaultCount": 0,
  "onTimeCount": 0,
  "isActive": true,
  "openedAt": "2024-01-15T10:30:00Z"
}
```

---

#### POST `/arbans/credit/family/:arbanId/borrow`
Borrow from Family credit line.

**Request:**
```json
{
  "amount": "5000.00",
  "durationDays": 30
}
```

**Response (201):**
```json
{
  "loanId": 1,
  "principal": "5000.00",
  "interest": "123.29",
  "totalDue": "5123.29",
  "dueDate": "2024-02-14T10:30:00Z",
  "txHash": "0x..."
}
```

---

#### POST `/arbans/credit/family/:arbanId/repay`
Repay Family loan.

**Request:**
```json
{
  "loanIdx": 0
}
```

---

#### GET `/arbans/credit/family/:arbanId`
Get Family credit line.

---

#### GET `/arbans/credit/family/:arbanId/loans`
Get all Family loans.

**Response (200):**
```json
[
  {
    "loanId": 1,
    "arbanId": 1,
    "creditType": 1,
    "principal": "5000",
    "interest": "123.29",
    "totalDue": "5123.29",
    "dueDate": "2024-02-14T10:30:00Z",
    "borrowedAt": "2024-01-15T10:30:00Z",
    "repaidAt": "2024-02-10T14:20:00Z",
    "isActive": false,
    "isDefaulted": false
  }
]
```

---

#### GET `/arbans/credit/family/:arbanId/dashboard`
Get Family credit dashboard with performance metrics.

**Response (200):**
```json
{
  "creditLine": { ... },
  "activeLoans": [ ... ],
  "loanHistory": [ ... ],
  "performance": {
    "onTimeRate": 95.5,
    "defaultRate": 4.5,
    "avgRepaymentDays": 28.3
  }
}
```

---

### Org Credit

Same endpoints as Family Credit but with `/org/` prefix:
- POST `/arbans/credit/org/:arbanId/open`
- POST `/arbans/credit/org/:arbanId/borrow`
- POST `/arbans/credit/org/:arbanId/repay`
- GET `/arbans/credit/org/:arbanId`
- GET `/arbans/credit/org/:arbanId/loans`
- GET `/arbans/credit/org/:arbanId/dashboard`

---

### Central Bank Admin

#### PUT `/arbans/credit/interest-rate`
Set interest rate (Central Bank Governing Council only).

**Authentication:** Requires Central Bank role.

**Request:**
```json
{
  "rateBps": 1200
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Interest rate updated",
  "rateBps": 1200
}
```

---

#### GET `/arbans/credit/interest-rate`
Get current interest rate.

**Response (200):**
```json
{
  "rateBps": 1200,
  "percentagePerYear": "12.00"
}
```

---

## Authentication & Authorization

### JWT Authentication
All endpoints require valid JWT token:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Roles
- **Citizen**: Can manage own Family Arbans, Zuns
- **Central Bank**: Can set interest rates
- **Org Leader**: Can manage organizational arbans

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "One or both parties are already married",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Only Central Bank Governing Council can perform this action",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Family Arban 123 not found",
  "error": "Not Found"
}
```

---

## Rate Limits
- Standard endpoints: 100 requests/minute
- Credit operations: 20 requests/minute
- Admin endpoints: 10 requests/minute

---

## WebSocket Events (Future)
Real-time updates for:
- New marriages
- Loan repayments
- Interest rate changes
- Khural representative updates
