import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketplaceListingType, MarketplaceListingStatus } from '@prisma/client';

/**
 * @controller MarketplaceController
 * @description REST API for marketplace operations
 * 
 * Endpoints:
 * - POST /marketplace/listings - Create listing
 * - GET /marketplace/listings - Get all listings (with filters)
 * - GET /marketplace/listings/:id - Get single listing
 * - PUT /marketplace/listings/:id - Update listing
 * - DELETE /marketplace/listings/:id - Delete listing
 * - POST /marketplace/purchase - Purchase item
 * - POST /marketplace/purchase/:id/ship - Ship item
 * - POST /marketplace/purchase/:id/deliver - Confirm delivery
 * - POST /marketplace/purchase/:id/complete - Complete purchase
 * - POST /marketplace/purchase/:id/rate - Rate transaction
 * - GET /marketplace/stats - Get statistics
 */
@ApiTags('Marketplace')
@Controller('marketplace')
@UseGuards(JwtAuthGuard)
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  /**
   * Create new listing
   */
  @Post('listings')
  async createListing(@Request() req, @Body() body: any) {
    const { categoryId, listingType, title, description, images, price, stock } = body;

    const listing = await this.marketplaceService.createListing({
      sellerId: req.user.userId,
      categoryId: parseInt(categoryId),
      listingType: listingType as MarketplaceListingType,
      title,
      description,
      images: images || [],
      price,
      stock: stock ? parseInt(stock) : 0,
    });

    return {
      success: true,
      data: listing,
    };
  }

  /**
   * Get all listings with optional filters
   */
  @Get('listings')
  async getAllListings(
    @Query('categoryId') categoryId?: string,
    @Query('listingType') listingType?: string,
    @Query('status') status?: string,
    @Query('sellerId') sellerId?: string,
    @Query('search') search?: string,
  ) {
    const filters: any = {};
    if (categoryId) filters.categoryId = parseInt(categoryId);
    if (listingType) filters.listingType = listingType as MarketplaceListingType;
    if (status) filters.status = status as MarketplaceListingStatus;
    if (sellerId) filters.sellerId = sellerId;
    if (search) filters.search = search;

    const listings = await this.marketplaceService.getAllListings(filters);

    return {
      success: true,
      data: listings,
    };
  }

  /**
   * Get single listing
   */
  @Get('listings/:id')
  async getListing(@Param('id') id: string) {
    const listing = await this.marketplaceService.getListing(id);

    return {
      success: true,
      data: listing,
    };
  }

  /**
   * Update listing
   */
  @Put('listings/:id')
  async updateListing(
    @Request() req,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const { title, description, price, stock, status, images } = body;

    const updated = await this.marketplaceService.updateListing(
      id,
      req.user.userId,
      {
        title,
        description,
        price,
        stock: stock ? parseInt(stock) : undefined,
        status: status as MarketplaceListingStatus,
        images,
      },
    );

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Delete listing (archive)
   */
  @Delete('listings/:id')
  async deleteListing(@Request() req, @Param('id') id: string) {
    const deleted = await this.marketplaceService.deleteListing(
      id,
      req.user.userId,
    );

    return {
      success: true,
      data: deleted,
    };
  }

  /**
   * Get my listings
   */
  @Get('my-listings')
  async getMyListings(@Request() req) {
    const listings = await this.marketplaceService.getMyListings(
      req.user.userId,
    );

    return {
      success: true,
      data: listings,
    };
  }

  /**
   * Purchase item
   */
  @Post('purchase')
  async purchaseItem(@Request() req, @Body() body: any) {
    const { listingId, quantity, shippingAddress } = body;

    const purchase = await this.marketplaceService.purchaseItem({
      listingId,
      buyerId: req.user.userId,
      quantity: parseInt(quantity),
      shippingAddress,
    });

    return {
      success: true,
      data: purchase,
      message: 'Purchase created. Please proceed to payment.',
    };
  }

  /**
   * Ship item (seller)
   */
  @Post('purchase/:id/ship')
  async shipItem(
    @Request() req,
    @Param('id') purchaseId: string,
    @Body() body: any,
  ) {
    const { trackingInfo } = body;

    const shipped = await this.marketplaceService.shipItem(
      purchaseId,
      req.user.userId,
      trackingInfo,
    );

    return {
      success: true,
      data: shipped,
    };
  }

  /**
   * Confirm delivery (buyer)
   */
  @Post('purchase/:id/deliver')
  async confirmDelivery(@Request() req, @Param('id') purchaseId: string) {
    const delivered = await this.marketplaceService.confirmDelivery({
      purchaseId,
      buyerId: req.user.userId,
    });

    return {
      success: true,
      data: delivered,
    };
  }

  /**
   * Complete purchase (buyer)
   */
  @Post('purchase/:id/complete')
  async completePurchase(@Request() req, @Param('id') purchaseId: string) {
    const completed = await this.marketplaceService.completePurchase(
      purchaseId,
      req.user.userId,
    );

    return {
      success: true,
      data: completed,
      message: 'Purchase completed. Funds released to seller.',
    };
  }

  /**
   * Rate transaction (buyer)
   */
  @Post('purchase/:id/rate')
  async rateTransaction(
    @Request() req,
    @Param('id') purchaseId: string,
    @Body() body: any,
  ) {
    const { rating, review } = body;

    const rated = await this.marketplaceService.rateTransaction({
      purchaseId,
      buyerId: req.user.userId,
      rating: parseInt(rating),
      review,
    });

    return {
      success: true,
      data: rated,
    };
  }

  /**
   * Get my purchases
   */
  @Get('my-purchases')
  async getMyPurchases(@Request() req) {
    const purchases = await this.marketplaceService.getMyPurchases(
      req.user.userId,
    );

    return {
      success: true,
      data: purchases,
    };
  }

  /**
   * Get my sales
   */
  @Get('my-sales')
  async getMySales(@Request() req) {
    const sales = await this.marketplaceService.getMySales(req.user.userId);

    return {
      success: true,
      data: sales,
    };
  }

  /**
   * Get marketplace statistics
   */
  @Get('stats')
  async getStats() {
    const stats = await this.marketplaceService.getStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Search listings
   */
  @Get('search')
  async search(@Query('q') query: string) {
    const results = await this.marketplaceService.searchListings(query);

    return {
      success: true,
      data: results,
    };
  }
}
