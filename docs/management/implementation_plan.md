# Marketplace Development - Implementation Plan

## Goal

Build complete Marketplace system for ALTAN economy - both General Marketplace (goods/services) and Job Marketplace (employment). This will enable peer-to-peer commerce and employment within the ecosystem.

## Background

**What exists:**
- ✅ Marketplace.sol - Smart contract for goods/services
- ✅ JobMarketplace.sol - Smart contract for job postings
- ❌ NO backend integration
- ❌ NO frontend UI

**What's missing:**
- Backend services (marketplace.service.ts, job-marketplace.service.ts)
- REST API controllers
- Frontend components (product listings, buy flow, seller dashboard)
- Job posting UI
- Application management

## Smart Contract Overview

### Marketplace.sol (General Goods/Services)

```solidity
// Key features:
- List product/service for sale
- Purchase with ALTAN
- Seller ratings
- Escrow system
- Dispute resolution
```

### JobMarketplace.sol

```solidity
// Key features:
- Post job opening
- Apply for jobs
- Accept/reject applications
- Payment escrow
- Completion verification
```

## Proposed Implementation

### Phase 1: Backend Services (Days 1-3)

#### marketplace.service.ts

```typescript
@Injectable()
export class MarketplaceService {
  // Listing management
  async createListing(data: CreateListingDto): Promise<string>;
  async getListing(id: number): Promise<Listing>;
  async getAllListings(): Promise<Listing[]>;
  async getMyListings(sellerId: number): Promise<Listing[]>;
  async updateListing(id: number, data: UpdateListingDto): Promise<string>;
  async deleteListing(id: number): Promise<string>;
  
  // Purchase flow
  async purchaseItem(listingId: number, buyerId: number): Promise<string>;
  async confirmDelivery(listingId: number, buyerId: number): Promise<string>;
  
  // Ratings
  async rateTransaction(transactionId: number, rating: number): Promise<string>;
  async getSellerRating(sellerId: number): Promise<number>;
  
  // Search & filter
  async searchListings(query: string): Promise<Listing[]>;
  async filterByCategory(category: string): Promise<Listing[]>;
}
```

#### job-marketplace.service.ts

```typescript
@Injectable()
export class JobMarketplaceService {
  // Job posting
  async createJob(data: CreateJobDto): Promise<string>;
  async getJob(id: number): Promise<Job>;
  async getAllJobs(): Promise<Job[]>;
  async getMyJobs(employerId: number): Promise<Job[]>;
  async closeJob(id: number): Promise<string>;
  
  // Applications
  async applyForJob(jobId: number, applicantId: number): Promise<string>;
  async getApplications(jobId: number): Promise<Application[]>;
  async acceptApplication(applicationId: number): Promise<string>;
  async rejectApplication(applicationId: number): Promise<string>;
  
  // Payment & completion
  async completeJob(jobId: number): Promise<string>;
  async releasePayment(jobId: number): Promise<string>;
  
  // Ratings
  async rateEmployer(jobId: number, rating: number): Promise<string>;
  async rateEmployee(jobId: number, rating: number): Promise<string>;
}
```

### Phase 2: REST API (Days 2-3)

#### marketplace.controller.ts

```typescript
@Controller('marketplace')
export class MarketplaceController {
  // Listings
  @Post('listings')
  async createListing(@Body() dto: CreateListingDto);
  
  @Get('listings')
  async getAllListings(@Query() filters: FilterDto);
  
  @Get('listings/:id')
  async getListing(@Param('id') id: string);
  
  @Put('listings/:id')
  async updateListing(@Param('id') id: string, @Body() dto: UpdateListingDto);
  
  @Delete('listings/:id')
  async deleteListing(@Param('id') id: string);
  
  // Purchases
  @Post('listings/:id/purchase')
  async purchaseItem(@Param('id') id: string, @Body() dto: PurchaseDto);
  
  @Post('listings/:id/confirm-delivery')
  async confirmDelivery(@Param('id') id: string);
  
  // Ratings
  @Post('transactions/:id/rate')
  async rateTransaction(@Param('id') id: string, @Body() dto: RatingDto);
  
  @Get('sellers/:id/rating')
  async getSellerRating(@Param('id') id: string);
  
  // Search
  @Get('search')
  async search(@Query('q') query: string);
  
  @Get('category/:category')
  async filterByCategory(@Param('category') category: string);
}
```

#### job-marketplace.controller.ts

```typescript
@Controller('jobs')
export class JobMarketplaceController {
  // Jobs
  @Post('/')
  async createJob(@Body() dto: CreateJobDto);
  
  @Get('/')
  async getAllJobs(@Query() filters: JobFilterDto);
  
  @Get('/:id')
  async getJob(@Param('id') id: string);
  
  @Delete('/:id')
  async closeJob(@Param('id') id: string);
  
  // Applications
  @Post('/:id/apply')
  async applyForJob(@Param('id') id: string, @Body() dto: ApplyDto);
  
  @Get('/:id/applications')
  async getApplications(@Param('id') id: string);
  
  @Put('/applications/:id/accept')
  async acceptApplication(@Param('id') id: string);
  
  @Put('/applications/:id/reject')
  async rejectApplication(@Param('id') id: string);
  
  // Completion
  @Post('/:id/complete')
  async completeJob(@Param('id') id: string);
  
  @Post('/:id/release-payment')
  async releasePayment(@Param('id') id: string);
  
  // Ratings
  @Post('/:id/rate-employer')
  async rateEmployer(@Param('id') id: string, @Body() dto: RatingDto);
  
  @Post('/:id/rate-employee')
  async rateEmployee(@Param('id') id: string, @Body() dto: RatingDto);
}
```

### Phase 3: Frontend Components (Days 4-7)

#### General Marketplace Components

**1. ProductListings.tsx**
```tsx
// Product grid with filters
- Search bar
- Category filters
- Price range
- Product cards (image, title, price, seller rating)
- Pagination
```

**2. ProductDetail.tsx**
```tsx
// Single product view
- Product images
- Description
- Price in ALTAN
- Seller info & rating
- "Buy Now" button
- Reviews section
```

**3. BuyFlow.tsx**
```tsx
// Purchase process
- Confirm purchase
- Review order
- Complete transaction
- Confirm delivery
- Rate seller
```

**4. SellerDashboard.tsx**
```tsx
// Seller management
- Active listings
- Sales history
- Revenue analytics
- Add new listing
- Edit/delete listings
```

**5. CreateListing.tsx**
```tsx
// Multi-step form
- Product details
- Images upload
- Pricing
- Category selection
- Preview & confirm
```

#### Job Marketplace Components

**6. JobListings.tsx**
```tsx
// Job board
- Search/filter jobs
- Job cards (title, company, salary, location)
- Categories
- "Apply" button
```

**7. JobDetail.tsx**
```tsx
// Single job view
- Job description
- Requirements
- Salary in ALTAN
- Company info
- "Apply" button
- Application form
```

**8. CreateJobPosting.tsx**
```tsx
// Employer form
- Job title
- Description
- Requirements
- Salary offer
- Duration
- Preview & post
```

**9. ApplicationsManager.tsx**
```tsx
// Employer view
- View all applications
- Applicant profiles
- Accept/reject buttons
- Communication
```

**10. MyApplications.tsx**
```tsx
// Job seeker view
- Applied jobs
- Application status
- Messages from employers
- Withdraw application
```

### Phase 4: Features & Integrations (Days 5-7)

#### Features to Implement:

1. **Image Upload**
   - Cloudinary/S3 integration
   - Product photos
   - Company logos

2. **Search & Filters**
   - Full-text search
   - Category filters
   - Price ranges
   - Location filters (for jobs)

3. **Ratings & Reviews**
   - 5-star rating system
   - Written reviews
   - Seller reputation
   - Employer/employee ratings

4. **Escrow System**
   - Secure payment holding
   - Dispute resolution
   - Automatic release on confirmation

5. **Notifications**
   - New purchase
   - Job application
   - Application accepted/rejected
   - Payment released

## Data Models (Prisma Schema)

```prisma
model Listing {
  id          Int      @id @default(autoincrement())
  sellerId    Int
  title       String
  description String
  price       String   // ALTAN amount
  category    String
  imageUrl    String?
  status      ListingStatus
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  seller      User     @relation("Seller", fields: [sellerId], references: [id])
  purchases   Purchase[]
}

enum ListingStatus {
  ACTIVE
  SOLD
  CANCELLED
}

model Purchase {
  id          Int      @id @default(autoincrement())
  listingId   Int
  buyerId     Int
  amount      String
  status      PurchaseStatus
  txHash      String?
  createdAt   DateTime @default(now())
  deliveredAt DateTime?
  rating      Int?
  review      String?
  
  listing     Listing  @relation(fields: [listingId], references: [id])
  buyer       User     @relation("Buyer", fields: [buyerId], references: [id])
}

enum PurchaseStatus {
  PENDING
  PAID
  DELIVERED
  COMPLETED
  DISPUTED
}

model Job {
  id          Int      @id @default(autoincrement())
  employerId  Int
  title       String
  description String
  salary      String   // ALTAN amount
  category    String
  location    String?
  status      JobStatus
  createdAt   DateTime @default(now())
  closedAt    DateTime?
  
  employer    User     @relation("Employer", fields: [employerId], references: [id])
  applications Application[]
}

enum JobStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model Application {
  id          Int      @id @default(autoincrement())
  jobId       Int
  applicantId Int
  message     String
  status      ApplicationStatus
  appliedAt   DateTime @default(now())
  respondedAt DateTime?
  
  job         Job      @relation(fields: [jobId], references: [id])
  applicant   User     @relation("Applicant", fields: [applicantId], references: [id])
}

enum ApplicationStatus {
  PENDING
  ACCEPTED
  REJECTED
  WITHDRAWN
}
```

## API Endpoints Summary

### General Marketplace (10 endpoints)

```
POST   /marketplace/listings
GET    /marketplace/listings
GET    /marketplace/listings/:id
PUT    /marketplace/listings/:id
DELETE /marketplace/listings/:id
POST   /marketplace/listings/:id/purchase
POST   /marketplace/listings/:id/confirm-delivery
POST   /marketplace/transactions/:id/rate
GET    /marketplace/sellers/:id/rating
GET    /marketplace/search?q=...
GET    /marketplace/category/:category
```

### Job Marketplace (11 endpoints)

```
POST   /jobs
GET    /jobs
GET    /jobs/:id
DELETE /jobs/:id
POST   /jobs/:id/apply
GET    /jobs/:id/applications
PUT    /jobs/applications/:id/accept
PUT    /jobs/applications/:id/reject
POST   /jobs/:id/complete
POST   /jobs/:id/release-payment
POST   /jobs/:id/rate-employer
POST   /jobs/:id/rate-employee
```

**Total:** 21 REST endpoints

## Implementation Timeline

### Week 1: Backend + Basic Frontend

**Day 1-2: Backend Services**
- [ ] marketplace.service.ts
- [ ] job-marketplace.service.ts
- [ ] Prisma schema updates
- [ ] Database migrations

**Day 3-4: REST API**
- [ ] marketplace.controller.ts
- [ ] job-marketplace.controller.ts
- [ ] marketplace.module.ts
- [ ] Integration in app.module.ts

**Day 5: Frontend Foundation**
- [ ] marketplace.api.ts client
- [ ] useMarketplace hook
- [ ] useJobMarketplace hook

**Day 6-7: Basic UI**
- [ ] ProductListings.tsx
- [ ] JobListings.tsx
- [ ] ProductDetail.tsx
- [ ] JobDetail.tsx

### Week 2: Advanced Features

**Day 8-9: Advanced UI**
- [ ] CreateListing.tsx
- [ ] CreateJobPosting.tsx
- [ ] BuyFlow.tsx
- [ ] SellerDashboard.tsx

**Day 10-11: Management**
- [ ] ApplicationsManager.tsx
- [ ] MyApplications.tsx
- [ ] Ratings & reviews

**Day 12-14: Polish & Testing**
- [ ] Search & filters
- [ ] Notifications
- [ ] Image upload
- [ ] End-to-end testing
- [ ] Documentation

## Success Criteria

- [ ] Users can list products/services
- [ ] Users can browse and purchase
- [ ] Escrow system works correctly
- [ ] Job postings work
- [ ] Application flow functional
- [ ] Ratings system operational
- [ ] Search & filters work
- [ ] Frontend responsive
- [ ] No bugs in production

## Ready to Build! 🛍️

This will complete the ALTAN economic ecosystem with peer-to-peer commerce.

**Estimated Total Time:** 1-2 weeks
