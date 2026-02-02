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

## 5. Legislative Branch API

### Base URL
```
http://localhost:3000/legislative
```

### POST `/legislative/voting/proposals`
Create new legislative proposal.

**Request:**
```json
{
  "proposalType": 0,
  "khuralLevel": 1,
  "khuralId": 1,
  "title": "School Budget 2026",
  "description": "Allocate 1000 ALTAN for local school renovation",
  "votingPeriod": 604800,
  "privateKey": "0x..."
}
```

**Proposal Types:**
- `0` - ARBAN_BUDGET
- `1` - ARBAN_LEADER
- `2` - ARBAN_PROJECT
- `3` - ZUN_POLICY
- `4` - ZUN_ELDER
- `5` - ZUN_BUDGET
- `6` - MYANGAN_LAW
- `7` - MYANGAN_LEADER
- `8` - TUMEN_NATIONAL
- `9` - TUMEN_CHAIRMAN
- `10` - CONSTITUTIONAL

**Khural Levels:**
- `1` - ARBAN (Local, 60% quorum)
- `2` - ZUN (Regional, 60% quorum)
- `3` - MYANGAN (Provincial, 70% quorum)
- `4` - TUMEN (National, 80% quorum)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "proposalId": 1,
    "txHash": "0x..."
  }
}
```

---

### GET `/legislative/voting/proposals/:id`
Get proposal details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "proposalId": 1,
    "proposalType": 0,
    "khuralLevel": 1,
    "khuralId": 1,
    "title": "School Budget 2026",
    "description": "Allocate 1000 ALTAN...",
    "proposer": "0x123...",
    "status": 0,
    "startTime": "2024-01-15T10:30:00Z",
    "endTime": "2024-01-22T10:30:00Z",
    "finalized": false,
    "executed": false,
    "results": {
      "votesFor": 6,
      "votesAgainst": 2,
      "quorumRequired": 6,
      "totalEligible": 10
    }
  }
}
```

**Status Values:**
- `0` - ACTIVE
- `1` - PASSED
- `2` - REJECTED
- `3` - EXECUTED
- `4` - CANCELLED

---

### GET `/legislative/voting/proposals`
List proposals by level.

**Query Parameters:**
- `level` (required): 1-4 (ARBAN, ZUN, MYANGAN, TUMEN)

**Response (200):**
```json
{
  "success": true,
  "data": [
    { ... proposal 1 ... },
    { ... proposal 2 ... }
  ]
}
```

---

### POST `/legislative/voting/proposals/:id/vote`
Cast vote on proposal.

**Request:**
```json
{
  "support": true,
  "reason": "Essential for education",
  "privateKey": "0x..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "txHash": "0x..."
  }
}
```

---

### POST `/legislative/voting/proposals/:id/finalize`
Finalize proposal after voting period.

**Request:**
```json
{
  "privateKey": "0x..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "PASSED",
    "txHash": "0x..."
  }
}
```

---

### GET `/legislative/voting/proposals/:id/results`
Get voting results.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "votesFor": 6,
    "votesAgainst": 2,
    "quorumRequired": 6,
    "totalEligible": 10
  }
}
```

---

### GET `/legislative/voting/proposals/:id/has-voted/:address`
Check if address voted.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "hasVoted": true
  }
}
```

---


---

## WebSocket Events (Future)
Real-time updates for:
- New marriages
- Loan repayments
- Interest rate changes
- Khural representative updates
- Legislative proposals
- Vote submissions
- Proposal finalization
- New marketplace listings
- Purchase notifications
- Job applications
- Application status updates

---

## Marketplace API

Complete marketplace and job marketplace REST API endpoints.

### Base URLs
```
http://localhost:3000/marketplace
http://localhost:3000/jobs
```

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

### General Marketplace Endpoints (15)

#### POST `/marketplace/listings`
Create a new product/service listing.

**Request:**
```json
{
  "categoryId": 1,
  "listingType": "PHYSICAL_GOOD",
  "title": "Handmade Mongolian Ger",
  "description": "Traditional felt ger, 20ft diameter",
  "price": "5000.00",
  "stock": 2,
  "images": ["https://..."]
}
```

**Response (201):**
```json
{
  "id": "uuid-123",
  "sellerId": "user-uuid",
  "status": "ACTIVE",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

#### GET `/marketplace/listings`
Get all marketplace listings with optional filters.

**Query Parameters:**
- `categoryId` - Filter by category
- `listingType` - PHYSICAL_GOOD | DIGITAL_GOOD | SERVICE | WORK
- `status` - DRAFT | ACTIVE | PAUSED | SOLD_OUT | ARCHIVED
- `sellerId` - Filter by seller
- `search` - Search in title/description
- `minPrice` - Minimum price
- `maxPrice` - Maximum price

**Response (200):**
```json
[
  {
    "id": "uuid-123",
    "sellerId": "user-uuid",
    "categoryId": 1,
    "listingType": "PHYSICAL_GOOD",
    "status": "ACTIVE",
    "title": "Handmade Mongolian Ger",
    "description": "Traditional felt ger...",
    "images": ["https://..."],
    "price": "5000.00",
    "stock": 2,
    "sold": 0,
    "totalRating": 0,
    "reviewCount": 0,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

#### GET `/marketplace/listings/:id`
Get single listing details.

**Response (200):**
```json
{
  "id": "uuid-123",
  "sellerId": "user-uuid",
  "title": "Handmade Mongolian Ger",
  "price": "5000.00",
  "stock": 2,
  "status": "ACTIVE",
  "purchases": []
}
```

---

#### GET `/marketplace/sellers/:sellerId/listings`
Get all listings by specific seller.

**Response (200):**
```json
{
  "active": 5,
  "soldOut": 2,
  "totalSales": 150,
  "listings": [...]
}
```

---

#### PUT `/marketplace/listings/:id`
Update listing (seller only).

**Request:**
```json
{
  "title": "Updated Title",
  "price": "4500.00",
  "stock": 3,
  "status": "ACTIVE"
}
```

**Response (200):**
```json
{
  "id": "uuid-123",
  "updatedAt": "2024-01-16T09:15:00Z"
}
```

---

#### DELETE `/marketplace/listings/:id`
Archive listing (soft delete, seller only).

**Response (200):**
```json
{
  "message": "Listing archived successfully"
}
```

---

#### POST `/marketplace/listings/:id/purchase`
Purchase an item.

**Request:**
```json
{
  "listingId": "uuid-123",
  "quantity": 1,
  "shippingAddress": "123 Main St, City"
}
```

**Response (201):**
```json
{
  "purchaseId": "purchase-uuid",
  "totalPrice": "5000.00",
  "status": "PENDING",
  "createdAt": "2024-01-16T10:00:00Z"
}
```

---

#### PUT `/marketplace/purchases/:id/mark-paid`
Mark purchase as paid by buyer.

**Request:**
```json
{
  "txHash": "0x123...",
  "escrowId": "escrow-123"
}
```

**Response (200):**
```json
{
  "purchaseId": "purchase-uuid",
  "status": "PAID",
  "paidAt": "2024-01-16T10:05:00Z"
}
```

---

#### PUT `/marketplace/purchases/:id/ship`
Mark item as shipped (seller only).

**Request:**
```json
{
  "trackingInfo": "TRACK-123456"
}
```

**Response (200):**
```json
{
  "purchaseId": "purchase-uuid",
  "status": "SHIPPED",
  "shippedAt": "2024-01-17T14:00:00Z"
}
```

---

#### PUT `/marketplace/purchases/:id/deliver`
Confirm delivery (buyer only).

**Response (200):**
```json
{
  "purchaseId": "purchase-uuid",
  "status": "DELIVERED",
  "deliveredAt": "2024-01-20T09:00:00Z"
}
```

---

#### PUT `/marketplace/purchases/:id/complete`
Complete transaction (buyer only).

**Response (200):**
```json
{
  "purchaseId": "purchase-uuid",
  "status": "COMPLETED",
  "completedAt": "2024-01-20T10:00:00Z"
}
```

---

#### POST `/marketplace/purchases/:id/rate`
Rate seller after purchase completion (buyer only).

**Request:**
```json
{
  "rating": 5,
  "review": "Excellent quality and fast shipping!"
}
```

**Response (200):**
```json
{
  "purchaseId": "purchase-uuid",
  "rating": 5,
  "review": "Excellent quality..."
}
```

---

#### GET `/marketplace/my/listings`
Get current user's listings.

**Response (200):**
```json
{
  "total": 10,
  "active": 7,
  "soldOut": 2,
  "archived": 1,
  "listings": [...]
}
```

---

#### GET `/marketplace/my/purchases`
Get current user's purchases.

**Response (200):**
```json
{
  "total": 5,
  "pending": 1,
  "completed": 4,
  "purchases": [...]
}
```

---

#### GET `/marketplace/my/sales`
Get current user's sales.

**Response (200):**
```json
{
  "total": 15,
  "revenue": "75000.00",
  "pending": 2,
  "completed": 13,
  "sales": [...]
}
```

---

#### GET `/marketplace/stats`
Get marketplace statistics.

**Response (200):**
```json
{
  "totalListings": 150,
  "activeListings": 120,
  "totalPurchases": 300,
  "completedPurchases": 280,
  "totalVolume": "1500000.00"
}
```

---

### Job Marketplace Endpoints (14)

#### POST `/jobs`
Create job posting.

**Request:**
```json
{
  "categoryId": 2,
  "title": "Full Stack Developer",
  "description": "Build marketplace features...",
  "requirements": "3+ years experience, NestJS, React",
  "salary": "8000.00",
  "duration": "3 months",
  "location": "Remote",
  "remote": true,
  "deadline": "2024-02-15T23:59:59Z"
}
```

**Response (201):**
```json
{
  "id": "job-uuid",
  "employerId": "user-uuid",
  "status": "OPEN",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

---

#### GET `/jobs`
Get all job postings with filters.

**Query Parameters:**
- `categoryId` - Filter by category
- `status` - OPEN | IN_PROGRESS | COMPLETED | CANCELLED | CLOSED
- `employerId` - Filter by employer
- `remote` - true | false
- `search` - Search in title/description

**Response (200):**
```json
[
  {
    "id": "job-uuid",
    "employerId": "user-uuid",
    "title": "Full Stack Developer",
    "description": "Build marketplace...",
    "salary": "8000.00",
    "location": "Remote",
    "remote": true,
    "status": "OPEN",
    "deadline": "2024-02-15T23:59:59Z",
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

---

#### GET `/jobs/:id`
Get job posting details.

**Response (200):**
```json
{
  "id": "job-uuid",
  "title": "Full Stack Developer",
  "description": "Build marketplace...",
  "requirements": "3+ years...",
  "salary": "8000.00",
  "status": "OPEN",
  "applications": []
}
```

---

#### GET `/jobs/employers/:employerId`
Get jobs by employer.

**Response (200):**
```json
{
  "open": 3,
  "inProgress": 2,
  "completed": 10,
  "jobs": [...]
}
```

---

#### PUT `/jobs/:id/close`
Close job posting (employer only).

**Response (200):**
```json
{
  "id": "job-uuid",
  "status": "CLOSED",
  "closedAt": "2024-01-20T10:00:00Z"
}
```

---

#### POST `/jobs/:id/apply`
Apply for job.

**Request:**
```json
{
  "coverLetter": "I am very interested in this position...",
  "resumeUrl": "https://...",
  "expectedSalary": "9000.00"
}
```

**Response (201):**
```json
{
  "applicationId": "app-uuid",
  "jobId": "job-uuid",
  "status": "PENDING",
  "appliedAt": "2024-01-16T11:00:00Z"
}
```

---

#### GET `/jobs/:id/applications`
Get job applications (employer only).

**Response (200):**
```json
{
  "total": 15,
  "pending": 10,
  "accepted": 1,
  "rejected": 4,
  "applications": [
    {
      "id": "app-uuid",
      "applicantId": "user-uuid",
      "coverLetter": "I am very interested...",
      "status": "PENDING",
      "appliedAt": "2024-01-16T11:00:00Z"
    }
  ]
}
```

---

#### GET `/jobs/applications/my`
Get user's job applications.

**Response (200):**
```json
{
  "total": 5,
  "pending": 3,
  "accepted": 1,
  "rejected": 1,
  "applications": [...]
}
```

---

#### PUT `/jobs/applications/:id/accept`
Accept application (employer only).

**Request:**
```json
{
  "notes": "Looking forward to working with you!"
}
```

**Response (200):**
```json
{
  "applicationId": "app-uuid",
  "status": "ACCEPTED",
  "respondedAt": "2024-01-17T09:00:00Z"
}
```

---

#### PUT `/jobs/applications/:id/reject`
Reject application (employer only).

**Request:**
```json
{
  "notes": "Thank you for applying. We went with another candidate."
}
```

**Response (200):**
```json
{
  "applicationId": "app-uuid",
  "status": "REJECTED",
  "respondedAt": "2024-01-17T09:05:00Z"
}
```

---

#### DELETE `/jobs/applications/:id/withdraw`
Withdraw application (applicant only).

**Response (200):**
```json
{
  "applicationId": "app-uuid",
  "status": "WITHDRAWN"
}
```

---

#### PUT `/jobs/:id/complete`
Mark job as completed (employer only).

**Response (200):**
```json
{
  "jobId": "job-uuid",
  "status": "COMPLETED",
  "closedAt": "2024-02-15T10:00:00Z"
}
```

---

#### GET `/jobs/stats`
Get job marketplace statistics.

**Response (200):**
```json
{
  "totalJobs": 50,
  "openJobs": 15,
  "totalApplications": 200,
  "acceptedApplications": 25
}
```

---

#### GET `/jobs/search`
Search jobs.

**Query Parameters:**
- `q` - Search query

**Response (200):**
```json
{
  "results": [...],
  "total": 10
}
```

---

## Marketplace Enums

**MarketplaceListingType:**
- `PHYSICAL_GOOD` - Physical products
- `DIGITAL_GOOD` - Digital downloads
- `SERVICE` - Services offered
- `WORK` - Work/projects

**MarketplaceListingStatus:**
- `DRAFT` - Not yet published
- `ACTIVE` - Available for purchase
- `PAUSED` - Temporarily unavailable
- `SOLD_OUT` - No stock remaining
- `ARCHIVED` - Soft deleted

**MarketplacePurchaseStatus:**
- `PENDING` - Awaiting payment
- `PAID` - Payment confirmed
- `SHIPPED` - Item shipped
- `DELIVERED` - Item delivered
- `COMPLETED` - Transaction complete
- `CANCELLED` - Cancelled by buyer/seller
- `DISPUTED` - Under dispute
- `REFUNDED` - Refunded

**JobPostingStatus:**
- `OPEN` - Accepting applications
- `IN_PROGRESS` - Job in progress
- `COMPLETED` - Job completed
- `CANCELLED` - Cancelled
- `CLOSED` - No longer accepting applications

**JobApplicationStatus:**
- `PENDING` - Awaiting review
- `ACCEPTED` - Application accepted
- `REJECTED` - Application rejected
- `WITHDRAWN` - Withdrawn by applicant

