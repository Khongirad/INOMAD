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

  // ============== ESCROW ENDPOINTS ==============

  /**
   * Create escrow for a purchase
   */
  @Post('escrow')
  async createEscrow(@Request() req, @Body() body: { purchaseId: string; sellerId: string; amount: string }) {
    const escrow = await this.marketplaceService.createEscrow(
      body.purchaseId,
      req.user.userId,
      body.sellerId,
      body.amount,
    );
    return { success: true, data: escrow };
  }

  /**
   * Fund an escrow (locks buyer's funds)
   */
  @Post('escrow/:id/fund')
  async fundEscrow(
    @Request() req,
    @Param('id') escrowId: string,
    @Body() body: { txHash?: string },
  ) {
    const escrow = await this.marketplaceService.fundEscrow(escrowId, req.user.userId, body.txHash);
    return { success: true, data: escrow };
  }

  /**
   * Release escrow funds to seller (buyer confirms)
   */
  @Post('escrow/:id/release')
  async releaseEscrow(@Request() req, @Param('id') escrowId: string) {
    const escrow = await this.marketplaceService.releaseEscrow(escrowId, req.user.userId);
    return { success: true, data: escrow, message: 'Funds released to seller' };
  }

  /**
   * Open a dispute on an escrow
   */
  @Post('escrow/:id/dispute')
  async openDispute(
    @Request() req,
    @Param('id') escrowId: string,
    @Body() body: { reason: string },
  ) {
    const escrow = await this.marketplaceService.openDispute(escrowId, req.user.userId, body.reason);
    return { success: true, data: escrow };
  }

  /**
   * Resolve a dispute (arbitrator)
   */
  @Post('escrow/:id/resolve')
  async resolveDispute(
    @Request() req,
    @Param('id') escrowId: string,
    @Body() body: { decision: 'RELEASE' | 'REFUND' },
  ) {
    const escrow = await this.marketplaceService.resolveDispute(escrowId, req.user.userId, body.decision);
    return { success: true, data: escrow };
  }

  /**
   * Get escrow details by ID
   */
  @Get('escrow/:id')
  async getEscrow(@Param('id') escrowId: string) {
    const escrow = await this.marketplaceService.getEscrow(escrowId);
    return { success: true, data: escrow };
  }

  /**
   * Get escrow by purchase ID
   */
  @Get('purchase/:id/escrow')
  async getEscrowByPurchase(@Param('id') purchaseId: string) {
    const escrow = await this.marketplaceService.getEscrowByPurchase(purchaseId);
    return { success: true, data: escrow };
  }

  /**
   * Get all disputed escrows (for arbitrators)
   */
  @Get('escrow/disputes')
  async getDisputedEscrows() {
    const disputes = await this.marketplaceService.getDisputedEscrows();
    return { success: true, data: disputes };
  }

  // ============== SHOPPING CART ENDPOINTS ==============

  /**
   * Get shopping cart
   */
  @Get('cart')
  async getCart(@Request() req) {
    const cart = await this.marketplaceService.getOrCreateCart(req.user.userId);
    return { success: true, data: cart };
  }

  /**
   * Add item to cart
   */
  @Post('cart/add')
  async addToCart(@Request() req, @Body() body: { listingId: string; quantity?: number }) {
    const cart = await this.marketplaceService.addToCart(
      req.user.userId,
      body.listingId,
      body.quantity || 1,
    );
    return { success: true, data: cart };
  }

  /**
   * Remove item from cart
   */
  @Delete('cart/item/:listingId')
  async removeFromCart(@Request() req, @Param('listingId') listingId: string) {
    const cart = await this.marketplaceService.removeFromCart(req.user.userId, listingId);
    return { success: true, data: cart };
  }

  /**
   * Update cart item quantity
   */
  @Put('cart/item/:listingId')
  async updateCartItem(
    @Request() req,
    @Param('listingId') listingId: string,
    @Body() body: { quantity: number },
  ) {
    const cart = await this.marketplaceService.updateCartItemQuantity(
      req.user.userId,
      listingId,
      body.quantity,
    );
    return { success: true, data: cart };
  }

  /**
   * Clear cart
   */
  @Delete('cart')
  async clearCart(@Request() req) {
    const cart = await this.marketplaceService.clearCart(req.user.userId);
    return { success: true, data: cart };
  }

  // ============== SEARCH & REPUTATION ==============

  /**
   * Full-text search (PostgreSQL ranked)
   */
  @Get('search/fulltext')
  async fullTextSearch(@Query('q') query: string, @Query('limit') limit?: string) {
    const results = await this.marketplaceService.fullTextSearch(query, limit ? parseInt(limit) : 20);
    return { success: true, data: results };
  }

  /**
   * Get seller reputation
   */
  @Get('seller/:id/reputation')
  async getSellerReputation(@Param('id') sellerId: string) {
    const reputation = await this.marketplaceService.getSellerReputation(sellerId);
    return { success: true, data: reputation };
  }
}
