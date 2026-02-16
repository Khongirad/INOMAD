import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketplaceListingType, MarketplaceListingStatus, MarketplacePurchaseStatus } from '@prisma/client';

export interface CreateListingDto {
  sellerId: string;
  categoryId: number;
  listingType: MarketplaceListingType;
  title: string;
  description: string;
  images?: string[];
  price: string;
  stock?: number;
}

export interface UpdateListingDto {
  title?: string;
  description?: string;
  price?: string;
  stock?: number;
  status?: MarketplaceListingStatus;
  images?: string[];
}

export interface PurchaseItemDto {
  listingId: string;
  buyerId: string;
  quantity: number;
  shippingAddress?: string;
}

export interface ConfirmDeliveryDto {
  purchaseId: string;
  buyerId: string;
}

export interface RateTransactionDto {
  purchaseId: string;
  buyerId: string;
  rating: number;
  review?: string;
}

/**
 * @service MarketplaceService
 * @description Service for managing marketplace listings and purchases
 * 
 * Features:
 * - Create/update/delete listings
 * - Purchase items
 * - Track delivery
 * - Ratings & reviews
 */
@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new marketplace listing
   */
  async createListing(data: CreateListingDto) {
    this.logger.log(`Creating listing: ${data.title}`);

    const listing = await this.prisma.marketplaceListing.create({
      data: {
        sellerId: data.sellerId,
        categoryId: data.categoryId,
        listingType: data.listingType,
        title: data.title,
        description: data.description,
        images: data.images || [],
        price: data.price,
        stock: data.stock || 0,
        status: MarketplaceListingStatus.ACTIVE,
      },
    });

    return listing;
  }

  /**
   * Get a single listing by ID
   */
  async getListing(id: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        purchases: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException(`Listing ${id} not found`);
    }

    // Calculate average rating
    const averageRating = listing.reviewCount > 0
      ? listing.totalRating / listing.reviewCount
      : 0;

    return {
      ...listing,
      averageRating: averageRating.toFixed(2),
    };
  }

  /**
   * Get all active listings with filters
   */
  async getAllListings(filters?: {
    categoryId?: number;
    listingType?: MarketplaceListingType;
    status?: MarketplaceListingStatus;
    sellerId?: string;
    minPrice?: string;
    maxPrice?: string;
    search?: string;
  }) {
    this.logger.log('Fetching listings with filters:', filters);

    const where: any = {};

    if (filters) {
      if (filters.categoryId) where.categoryId = filters.categoryId;
      if (filters.listingType) where.listingType = filters.listingType;
      if (filters.status) where.status = filters.status;
      if (filters.sellerId) where.sellerId = filters.sellerId;
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
    }

    const listings = await this.prisma.marketplaceListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });

    return listings.map(listing => ({
      ...listing,
      averageRating: listing.reviewCount > 0
        ? (listing.totalRating / listing.reviewCount).toFixed(2)
        : '0.00',
      totalPurchases: listing._count.purchases,
    }));
  }

  /**
   * Get listings by seller
   */
  async getMyListings(sellerId: string) {
    return this.getAllListings({ sellerId });
  }

  /**
   * Update listing
   */
  async updateListing(id: string, sellerId: string, data: UpdateListingDto) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException(`Listing ${id} not found`);
    }

    if (listing.sellerId !== sellerId) {
      throw new BadRequestException('Not authorized to update this listing');
    }

    return this.prisma.marketplaceListing.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete listing (soft delete - mark as ARCHIVED)
   */
  async deleteListing(id: string, sellerId: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException(`Listing ${id} not found`);
    }

    if (listing.sellerId !== sellerId) {
      throw new BadRequestException('Not authorized to delete this listing');
    }

    return this.prisma.marketplaceListing.update({
      where: { id },
      data: { status: MarketplaceListingStatus.ARCHIVED },
    });
  }

  /**
   * Purchase an item
   */
  async purchaseItem(data: PurchaseItemDto) {
    this.logger.log(`Purchase request: listing ${data.listingId} by ${data.buyerId}`);

    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: data.listingId },
    });

    if (!listing) {
      throw new NotFoundException(`Listing ${data.listingId} not found`);
    }

    if (listing.status !== MarketplaceListingStatus.ACTIVE) {
      throw new BadRequestException('Listing is not active');
    }

    // Check stock
    if (listing.stock > 0 && listing.stock < data.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    const totalPrice = (parseFloat(listing.price) * data.quantity).toString();

    // Create purchase
    const purchase = await this.prisma.marketplacePurchase.create({
      data: {
        listingId: data.listingId,
        buyerId: data.buyerId,
        quantity: data.quantity,
        totalPrice,
        shippingAddress: data.shippingAddress,
        status: MarketplacePurchaseStatus.PENDING,
      },
    });

    // Update listing stock and sold count
    await this.prisma.marketplaceListing.update({
      where: { id: data.listingId },
      data: {
        stock: listing.stock > 0 ? listing.stock - data.quantity : 0,
        sold: listing.sold + data.quantity,
        status: listing.stock > 0 && listing.stock - data.quantity === 0
          ? MarketplaceListingStatus.SOLD_OUT
          : listing.status,
      },
    });

    return purchase;
  }

  /**
   * Mark purchase as paid (after blockchain TX)
   */
  async markAsPaid(purchaseId: string, txHash: string, escrowId?: string) {
    return this.prisma.marketplacePurchase.update({
      where: { id: purchaseId },
      data: {
        status: MarketplacePurchaseStatus.PAID,
        txHash,
        escrowId,
        paidAt: new Date(),
      },
    });
  }

  /**
   * Mark item as shipped (seller)
   */
  async shipItem(purchaseId: string, sellerId: string, trackingInfo?: string) {
    const purchase = await this.prisma.marketplacePurchase.findUnique({
      where: { id: purchaseId },
      include: { listing: true },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase ${purchaseId} not found`);
    }

    if (purchase.listing.sellerId !== sellerId) {
      throw new BadRequestException('Not authorized');
    }

    if (purchase.status !== MarketplacePurchaseStatus.PAID) {
      throw new BadRequestException('Purchase not paid yet');
    }

    return this.prisma.marketplacePurchase.update({
      where: { id: purchaseId },
      data: {
        status: MarketplacePurchaseStatus.SHIPPED,
        trackingInfo,
        shippedAt: new Date(),
      },
    });
  }

  /**
   * Confirm delivery (buyer)
   */
  async confirmDelivery(data: ConfirmDeliveryDto) {
    const purchase = await this.prisma.marketplacePurchase.findUnique({
      where: { id: data.purchaseId },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase ${data.purchaseId} not found`);
    }

    if (purchase.buyerId !== data.buyerId) {
      throw new BadRequestException('Not authorized');
    }

    if (purchase.status !== MarketplacePurchaseStatus.SHIPPED) {
      throw new BadRequestException('Item not shipped yet');
    }

    return this.prisma.marketplacePurchase.update({
      where: { id: data.purchaseId },
      data: {
        status: MarketplacePurchaseStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });
  }

  /**
   * Complete purchase and release funds (buyer)
   */
  async completePurchase(purchaseId: string, buyerId: string) {
    const purchase = await this.prisma.marketplacePurchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase ${purchaseId} not found`);
    }

    if (purchase.buyerId !== buyerId) {
      throw new BadRequestException('Not authorized');
    }

    if (purchase.status !== MarketplacePurchaseStatus.DELIVERED) {
      throw new BadRequestException('Item not delivered yet');
    }

    return this.prisma.marketplacePurchase.update({
      where: { id: purchaseId },
      data: {
        status: MarketplacePurchaseStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Rate transaction
   */
  async rateTransaction(data: RateTransactionDto) {
    const purchase = await this.prisma.marketplacePurchase.findUnique({
      where: { id: data.purchaseId },
      include: { listing: true },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase ${data.purchaseId} not found`);
    }

    if (purchase.buyerId !== data.buyerId) {
      throw new BadRequestException('Not authorized');
    }

    if (purchase.status !== MarketplacePurchaseStatus.COMPLETED) {
      throw new BadRequestException('Purchase not completed yet');
    }

    if (purchase.rating) {
      throw new BadRequestException('Already rated');
    }

    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Update purchase with rating
    const updated = await this.prisma.marketplacePurchase.update({
      where: { id: data.purchaseId },
      data: {
        rating: data.rating,
        review: data.review,
      },
    });

    // Update listing rating
    await this.prisma.marketplaceListing.update({
      where: { id: purchase.listingId },
      data: {
        totalRating: { increment: data.rating },
        reviewCount: { increment: 1 },
      },
    });

    return updated;
  }

  /**
   * Get purchases for buyer
   */
  async getMyPurchases(buyerId: string) {
    return this.prisma.marketplacePurchase.findMany({
      where: { buyerId },
      include: {
        listing: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get sales for seller
   */
  async getMySales(sellerId: string) {
    return this.prisma.marketplacePurchase.findMany({
      where: {
        listing: {
          sellerId,
        },
      },
      include: {
        listing: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get marketplace statistics
   */
  async getStats() {
    const [
      totalListings,
      activeListings,
      totalPurchases,
      completedPurchases,
    ] = await Promise.all([
      this.prisma.marketplaceListing.count(),
      this.prisma.marketplaceListing.count({ where: { status: MarketplaceListingStatus.ACTIVE } }),
      this.prisma.marketplacePurchase.count(),
      this.prisma.marketplacePurchase.count({ where: { status: 'COMPLETED' } }),
    ]);

    // Calculate total volume
    const purchases = await this.prisma.marketplacePurchase.findMany({
      where: { status: MarketplacePurchaseStatus.COMPLETED },
      select: { totalPrice: true },
    });

    const totalVolume = purchases.reduce(
      (sum, p) => sum + parseFloat(p.totalPrice),
      0
    );

    return {
      totalListings,
      activeListings,
      totalPurchases,
      completedPurchases,
      totalVolume: totalVolume.toFixed(2),
    };
  }

  /**
   * Search listings
   */
  async searchListings(query: string) {
    return this.getAllListings({ search: query });
  }

  // ============== ESCROW ==============

  /**
   * Create an escrow transaction for a purchase.
   * Called automatically when a purchase is made.
   */
  async createEscrow(purchaseId: string, buyerId: string, sellerId: string, amount: string) {
    this.logger.log(`Creating escrow for purchase ${purchaseId}: ${amount} ALTAN`);

    return this.prisma.escrowTransaction.create({
      data: {
        purchaseId,
        buyerId,
        sellerId,
        amount: parseFloat(amount),
        status: 'CREATED',
      },
    });
  }

  /**
   * Fund the escrow — marks funds as locked.
   * In a real system, this would call a smart contract to lock tokens.
   */
  async fundEscrow(escrowId: string, buyerId: string, lockTxHash?: string) {
    const escrow = await this.prisma.escrowTransaction.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) throw new NotFoundException(`Escrow ${escrowId} not found`);
    if (escrow.buyerId !== buyerId) throw new BadRequestException('Not authorized');
    if (escrow.status !== 'CREATED') throw new BadRequestException('Escrow already funded or closed');

    // Update escrow
    const updated = await this.prisma.escrowTransaction.update({
      where: { id: escrowId },
      data: {
        status: 'FUNDED',
        lockTxHash,
        fundedAt: new Date(),
      },
    });

    // Also mark the purchase as paid
    await this.prisma.marketplacePurchase.update({
      where: { id: escrow.purchaseId },
      data: {
        status: MarketplacePurchaseStatus.PAID,
        escrowId: escrowId,
        paidAt: new Date(),
        txHash: lockTxHash,
      },
    });

    return updated;
  }

  /**
   * Release escrow funds to the seller.
   * Called when buyer confirms completion.
   */
  async releaseEscrow(escrowId: string, buyerId: string) {
    const escrow = await this.prisma.escrowTransaction.findUnique({
      where: { id: escrowId },
      include: { purchase: true },
    });

    if (!escrow) throw new NotFoundException(`Escrow ${escrowId} not found`);
    if (escrow.buyerId !== buyerId) throw new BadRequestException('Not authorized');
    if (escrow.status !== 'FUNDED') throw new BadRequestException('Escrow not in funded state');

    // In a real system: call smart contract to release funds to seller
    const releaseTxHash = `release-${Date.now().toString(36)}`;

    // Update escrow
    const updated = await this.prisma.escrowTransaction.update({
      where: { id: escrowId },
      data: {
        status: 'RELEASED',
        releaseTxHash,
        releasedAt: new Date(),
      },
    });

    // Complete the purchase
    await this.prisma.marketplacePurchase.update({
      where: { id: escrow.purchaseId },
      data: {
        status: MarketplacePurchaseStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Open a dispute on an escrow.
   * Either buyer or seller can dispute.
   */
  async openDispute(escrowId: string, userId: string, reason: string) {
    const escrow = await this.prisma.escrowTransaction.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) throw new NotFoundException(`Escrow ${escrowId} not found`);
    if (escrow.buyerId !== userId && escrow.sellerId !== userId) {
      throw new BadRequestException('Not authorized — only buyer or seller can dispute');
    }
    if (escrow.status !== 'FUNDED') {
      throw new BadRequestException('Can only dispute funded escrows');
    }

    const updated = await this.prisma.escrowTransaction.update({
      where: { id: escrowId },
      data: {
        status: 'DISPUTED',
        disputeReason: reason,
        disputedAt: new Date(),
      },
    });

    // Mark purchase as disputed
    await this.prisma.marketplacePurchase.update({
      where: { id: escrow.purchaseId },
      data: { status: MarketplacePurchaseStatus.DISPUTED },
    });

    return updated;
  }

  /**
   * Resolve a dispute — arbitrator decides whether to release or refund.
   */
  async resolveDispute(escrowId: string, resolverId: string, decision: 'RELEASE' | 'REFUND') {
    const escrow = await this.prisma.escrowTransaction.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) throw new NotFoundException(`Escrow ${escrowId} not found`);
    if (escrow.status !== 'DISPUTED') throw new BadRequestException('Escrow is not in disputed state');

    const isRelease = decision === 'RELEASE';
    const txHash = `${decision.toLowerCase()}-${Date.now().toString(36)}`;

    // Update escrow
    const updated = await this.prisma.escrowTransaction.update({
      where: { id: escrowId },
      data: {
        status: isRelease ? 'RESOLVED' : 'REFUNDED',
        resolvedBy: resolverId,
        resolvedAt: new Date(),
        releaseTxHash: isRelease ? txHash : undefined,
        releasedAt: isRelease ? new Date() : undefined,
        refundedAt: !isRelease ? new Date() : undefined,
      },
    });

    // Update purchase
    await this.prisma.marketplacePurchase.update({
      where: { id: escrow.purchaseId },
      data: {
        status: isRelease
          ? MarketplacePurchaseStatus.COMPLETED
          : MarketplacePurchaseStatus.REFUNDED,
        completedAt: isRelease ? new Date() : undefined,
      },
    });

    return updated;
  }

  /**
   * Get escrow details by ID.
   */
  async getEscrow(escrowId: string) {
    const escrow = await this.prisma.escrowTransaction.findUnique({
      where: { id: escrowId },
      include: {
        purchase: { include: { listing: true } },
        buyer: { select: { id: true, username: true } },
        seller: { select: { id: true, username: true } },
      },
    });

    if (!escrow) throw new NotFoundException(`Escrow ${escrowId} not found`);
    return escrow;
  }

  /**
   * Get escrow by purchase ID.
   */
  async getEscrowByPurchase(purchaseId: string) {
    const escrow = await this.prisma.escrowTransaction.findUnique({
      where: { purchaseId },
      include: {
        purchase: { include: { listing: true } },
        buyer: { select: { id: true, username: true } },
        seller: { select: { id: true, username: true } },
      },
    });

    if (!escrow) throw new NotFoundException(`Escrow for purchase ${purchaseId} not found`);
    return escrow;
  }

  /**
   * Get all disputed escrows (for arbitrators).
   */
  async getDisputedEscrows() {
    return this.prisma.escrowTransaction.findMany({
      where: { status: 'DISPUTED' },
      include: {
        purchase: { include: { listing: true } },
        buyer: { select: { id: true, username: true } },
        seller: { select: { id: true, username: true } },
      },
      orderBy: { disputedAt: 'asc' },
    });
  }

  // ============== SHOPPING CART ==============

  /**
   * Get or create cart for a user.
   */
  async getOrCreateCart(userId: string) {
    let cart = await this.prisma.shoppingCart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { listing: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.shoppingCart.create({
        data: { user: { connect: { id: userId } } },
        include: {
          items: {
            include: { listing: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    // Calculate total
    const total = cart.items.reduce(
      (sum: number, item: any) => sum + parseFloat(item.listing.price) * item.quantity,
      0,
    );

    return { ...cart, total: total.toFixed(2) };
  }

  /**
   * Add item to cart (upsert — increase quantity if already in cart).
   */
  async addToCart(userId: string, listingId: string, quantity: number = 1) {
    // Validate listing
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException(`Listing ${listingId} not found`);
    if (listing.status !== 'ACTIVE') throw new BadRequestException('Listing is not active');

    // Get or create cart
    let cart = await this.prisma.shoppingCart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await this.prisma.shoppingCart.create({ data: { userId } });
    }

    // Upsert cart item
    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_listingId: { cartId: cart.id, listingId } },
    });

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, listingId, quantity },
      });
    }

    return this.getOrCreateCart(userId);
  }

  /**
   * Remove item from cart.
   */
  async removeFromCart(userId: string, listingId: string) {
    const cart = await this.prisma.shoppingCart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart not found');

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, listingId },
    });

    return this.getOrCreateCart(userId);
  }

  /**
   * Update item quantity in cart.
   */
  async updateCartItemQuantity(userId: string, listingId: string, quantity: number) {
    if (quantity <= 0) return this.removeFromCart(userId, listingId);

    const cart = await this.prisma.shoppingCart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.prisma.cartItem.findUnique({
      where: { cartId_listingId: { cartId: cart.id, listingId } },
    });
    if (!item) throw new NotFoundException('Item not in cart');

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    return this.getOrCreateCart(userId);
  }

  /**
   * Clear all items from cart.
   */
  async clearCart(userId: string) {
    const cart = await this.prisma.shoppingCart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart not found');

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getOrCreateCart(userId);
  }

  // ============== FULL-TEXT SEARCH ==============

  /**
   * Full-text search using PostgreSQL tsvector/tsquery for ranked results.
   * Falls back to ILIKE if tsquery fails (e.g., special characters).
   */
  async fullTextSearch(query: string, limit: number = 20) {
    this.logger.log(`Full-text search: "${query}"`);

    try {
      // Use raw SQL with PostgreSQL full-text search
      const results = await this.prisma.$queryRaw`
        SELECT id, title, description, price, status, "listingType", "sellerId",
               "totalRating", "reviewCount", stock, sold,
               ts_rank(
                 to_tsvector('english', title || ' ' || description),
                 plainto_tsquery('english', ${query})
               ) AS rank
        FROM "MarketplaceListing"
        WHERE status = 'ACTIVE'
          AND to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', ${query})
        ORDER BY rank DESC
        LIMIT ${limit}
      `;

      return (results as any[]).map(r => ({
        ...r,
        averageRating: r.reviewCount > 0
          ? (r.totalRating / r.reviewCount).toFixed(2)
          : '0.00',
      }));
    } catch {
      // Fallback to basic search
      this.logger.warn('Full-text search failed, falling back to basic search');
      return this.searchListings(query);
    }
  }

  // ============== SELLER REPUTATION ==============

  /**
   * Get aggregated seller reputation.
   * Combines average rating, total sales, completion rate, and dispute rate.
   */
  async getSellerReputation(sellerId: string) {
    // Get all purchases for this seller's listings
    const purchases = await this.prisma.marketplacePurchase.findMany({
      where: { listing: { sellerId } },
      select: {
        status: true,
        rating: true,
        totalPrice: true,
      },
    });

    const totalSales = purchases.length;
    const completedSales = purchases.filter(p => p.status === 'COMPLETED').length;
    const disputedSales = purchases.filter(p => p.status === 'DISPUTED').length;
    const refundedSales = purchases.filter(p => p.status === 'REFUNDED').length;

    const ratings = purchases.filter(p => p.rating !== null).map(p => p.rating!);
    const averageRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

    const totalVolume = purchases
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + parseFloat(p.totalPrice), 0);

    // Reputation score (0-100): weighted combination
    // 40% average rating, 30% completion rate, 20% volume factor, 10% activity
    const completionRate = totalSales > 0 ? completedSales / totalSales : 0;
    const disputeRate = totalSales > 0 ? disputedSales / totalSales : 0;
    const volumeFactor = Math.min(totalVolume / 10000, 1); // cap at 10k ALTAN
    const activityFactor = Math.min(totalSales / 50, 1); // cap at 50 sales

    const reputationScore = Math.round(
      (averageRating / 5) * 40 +
      completionRate * 30 +
      volumeFactor * 20 +
      activityFactor * 10 -
      disputeRate * 15, // penalty for disputes
    );

    // Get active listings count
    const activeListings = await this.prisma.marketplaceListing.count({
      where: { sellerId, status: 'ACTIVE' },
    });

    return {
      sellerId,
      reputationScore: Math.max(0, Math.min(100, reputationScore)),
      averageRating: averageRating.toFixed(2),
      totalRatings: ratings.length,
      totalSales,
      completedSales,
      disputedSales,
      refundedSales,
      completionRate: (completionRate * 100).toFixed(1) + '%',
      disputeRate: (disputeRate * 100).toFixed(1) + '%',
      totalVolume: totalVolume.toFixed(2),
      activeListings,
      tier: reputationScore >= 80 ? 'GOLD'
        : reputationScore >= 60 ? 'SILVER'
        : reputationScore >= 40 ? 'BRONZE'
        : 'NEW',
    };
  }
}
