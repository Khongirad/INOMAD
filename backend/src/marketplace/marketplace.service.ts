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
}
