import { ApiTags } from '@nestjs/swagger';
import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { SeatBindingService } from './seat-binding.service';
import { BindSeatDto, SyncSeatsDto } from './dto/seat-binding.dto';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { Request } from '@nestjs/common';

@ApiTags('SeatBinding')
@Controller('seat-binding')
export class SeatBindingController {
  constructor(private seatBindingService: SeatBindingService) {}

  /**
   * Bind a seat to the authenticated user
   * Requires on-chain verification
   */
  @Post('bind')
  bindSeat(@Body() dto: BindSeatDto, @Request() req: AuthenticatedRequest) {
    return this.seatBindingService.bindSeatToUser(
      req.user.id,
      dto.seatId,
      dto.walletAddress,
    );
  }

  /**
   * Get seat binding status for authenticated user
   */
  @Get('status')
  getStatus(@Request() req: AuthenticatedRequest) {
    return this.seatBindingService.getSeatBindingStatus(req.user.id);
  }

  /**
   * Get seat binding status for specific user (admin)
   */
  @Get('status/:userId')
  getUserStatus(@Param('userId') userId: string) {
    return this.seatBindingService.getSeatBindingStatus(userId);
  }

  /**
   * Verify current seat binding is still valid
   */
  @Post('verify')
  async verifyBinding(@Request() req: AuthenticatedRequest) {
    const isValid = await this.seatBindingService.verifySeatBinding(req.user.id);
    return {
      userId: req.user.id,
      seatId: req.user.seatId,
      valid: isValid,
    };
  }

  /**
   * Sync all seats owned by a wallet address
   */
  @Post('sync')
  syncSeats(@Body() dto: SyncSeatsDto) {
    return this.seatBindingService.syncSeatsFromBlockchain(dto.walletAddress);
  }
}
