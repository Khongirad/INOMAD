import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';
import { IdentityBlockchainService } from './identity-blockchain.service';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import {
  RegisterIdentityDto,
  VerifyIdentityDto,
  SuperVerifyDto,
  ApproveActivationDto,
  RequestActivationDto,
} from './dto/identity.dto';

@Controller('identity')
export class IdentityController {
  constructor(
    private registrationService: RegistrationService,
    private verificationService: VerificationService,
    private identityBlockchain: IdentityBlockchainService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() data: RegisterIdentityDto) {
    const user = await this.registrationService.initiateRegistration(data);
    const allocation = await this.registrationService.assignTerritory(user.id, data.birthPlace.district || data.birthPlace.city);
    
    // Fetch updated user to get seatId
    const updatedUser = await this.registrationService.getUpdatedUser(user.id);
    return { user: updatedUser, allocation };
  }

  @Get('status/:userId')
  async getStatus(@Param('userId') userId: string) {
    return this.verificationService.getVerificationStatus(userId);
  }

  @Post('verify')
  async verify(@Request() req: any, @Body() body: VerifyIdentityDto) {
    const verifierSeatId = req.user?.seatId;
    return this.verificationService.submitVerification(verifierSeatId, body.targetUserId);
  }

  @Post('super-verify')
  async superVerify(@Request() req: any, @Body() body: SuperVerifyDto) {
    const mandateSeatId = req.user?.seatId;
    return this.verificationService.superVerify(mandateSeatId, body.targetUserId, body.justification);
  }

  @Get('blockchain-status/:seatId')
  async getBlockchainStatus(@Param('seatId') seatId: string) {
    return this.identityBlockchain.getOnChainStatus(seatId);
  }

  @Get('verification-progress/:userId')
  async getVerificationProgress(@Param('userId') userId: string) {
    return this.identityBlockchain.getVerificationProgress(userId);
  }

  @Post('sync/:userId')
  async syncFromBlockchain(@Param('userId') userId: string) {
    return this.identityBlockchain.syncUserFromBlockchain(userId);
  }

  @Get('audit/:userId')
  async auditUserState(@Param('userId') userId: string) {
    return this.identityBlockchain.auditUserState(userId);
  }

  // ==================== ON-CHAIN ACTIVATION ENDPOINTS ====================

  /**
   * Get on-chain activation status for a seat
   */
  @Get('activation/:seatId')
  async getActivationStatus(@Param('seatId') seatId: string) {
    return this.identityBlockchain.getActivationStatus(seatId);
  }

  /**
   * Request on-chain activation for the authenticated user's seat
   * Requires Constitution acceptance
   */
  @Post('activation/request')
  async requestActivation(
    @Request() req: any,
    @Body() body: RequestActivationDto,
  ) {
    const seatId = req.user?.seatId;
    if (!seatId) {
      return { success: false, error: 'No seatId found for user' };
    }

    // Get signer
    const rpcUrl = this.configService.get<string>('RPC_URL') || 'http://localhost:8545';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const privateKey = body.privateKey || this.configService.get<string>('DEFAULT_SIGNER_KEY');
    if (!privateKey) {
      return { success: false, error: 'Private key required' };
    }

    const signer = new ethers.Wallet(privateKey, provider);
    
    return this.identityBlockchain.requestActivation(seatId, signer);
  }

  /**
   * Approve activation for a seat (validators only)
   */
  @Post('activation/approve')
  async approveActivation(
    @Body() body: ApproveActivationDto,
  ) {
    if (!body.seatId) {
      return { success: false, error: 'seatId is required' };
    }

    // Get signer
    const rpcUrl = this.configService.get<string>('RPC_URL') || 'http://localhost:8545';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const privateKey = body.privateKey || this.configService.get<string>('DEFAULT_SIGNER_KEY');
    if (!privateKey) {
      return { success: false, error: 'Private key required for validator' };
    }

    const signer = new ethers.Wallet(privateKey, provider);
    
    return this.identityBlockchain.approveActivation(body.seatId, signer);
  }

  /**
   * Check if an address is a validator
   */
  @Get('validator/:address')
  async isValidator(@Param('address') address: string) {
    const isValidator = await this.identityBlockchain.isValidator(address);
    return { address, isValidator };
  }

  /**
   * Sync activation status from blockchain to database
   */
  @Post('activation/sync/:userId')
  async syncActivation(@Param('userId') userId: string) {
    return this.identityBlockchain.syncActivationToDb(userId);
  }
}

