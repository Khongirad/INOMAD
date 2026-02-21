import { ApiTags } from '@nestjs/swagger';
import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  UseGuards,
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { MPCWalletService } from './mpc-wallet.service';
import { RecoveryService } from './recovery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecoveryMethod, GuardianType } from '@prisma/client';

// ==================== DTOs ====================

class CreateWalletDto {
  recoveryMethod?: RecoveryMethod;
}


class SignTransactionDto {
  deviceShare: string;
  transaction: {
    to: string;
    value?: string;
    data?: string;
    gasLimit?: string;
  };
  broadcast?: boolean;
}

class SignMessageDto {
  deviceShare: string;
  message: string;
}

class MigrateWalletDto {
  privateKey: string;
}

class AddGuardianDto {
  guardianType: GuardianType;
  guardianRef: string;        // Email, phone, or user ID
  guardianName?: string;
  guardianUserId?: string;    // If Altan user
}

class InitiateRecoveryDto {
  address: string;
  method: RecoveryMethod;
}

class ConfirmRecoveryDto {
  sessionId: string;
  verificationCode?: string;
}


// ==================== CONTROLLER ====================

@ApiTags('Wallet')
@Controller('mpc-wallet')
@UseGuards(JwtAuthGuard)
export class MPCWalletController {
  constructor(
    private readonly walletService: MPCWalletService,
    private readonly recoveryService: RecoveryService,
  ) {}

  /**
   * Create new MPC wallet for authenticated user
   */
  @Post('create')
  async createWallet(
    @Request() req,
    @Body() dto: CreateWalletDto
  ) {
    const result = await this.walletService.createWallet(
      req.user.userId,
      dto.recoveryMethod
    );
    
    return {
      success: true,
      data: {
        address: result.address,
        deviceShare: result.deviceShare,
        walletId: result.walletId,
      },
      message: 'MPC wallet created. Store deviceShare securely on your device.',
    };
  }

  /**
   * Get wallet info for authenticated user
   */
  @Get('me')
  async getMyWallet(@Request() req) {
    const wallet = await this.walletService.getWallet(req.user.userId);
    
    return {
      success: true,
      data: {
        id: wallet.id,
        address: wallet.address,
        status: wallet.status,
        recoveryMethod: wallet.recoveryMethod,
        guardianCount: wallet.guardians.length,
        hasSmartAccount: !!wallet.smartAccount,
        createdAt: wallet.createdAt,
        lastUsedAt: wallet.lastUsedAt,
      }
    };
  }

  /**
   * Sign transaction
   */
  @Post('sign-transaction')
  @HttpCode(HttpStatus.OK)
  async signTransaction(
    @Request() req,
    @Body() dto: SignTransactionDto
  ) {
    const wallet = await this.walletService.getWallet(req.user.userId);
    
    const result = await this.walletService.signTransaction(
      wallet.id,
      dto.deviceShare,
      {
        to: dto.transaction.to,
        value: dto.transaction.value,
        data: dto.transaction.data,
        gasLimit: dto.transaction.gasLimit,
      },
      dto.broadcast
    );
    
    return {
      success: true,
      data: {
        signedTransaction: result.signedTx,
        hash: result.hash,
      }
    };
  }

  /**
   * Sign message
   */
  @Post('sign-message')
  @HttpCode(HttpStatus.OK)
  async signMessage(
    @Request() req,
    @Body() dto: SignMessageDto
  ) {
    const wallet = await this.walletService.getWallet(req.user.userId);
    
    const signature = await this.walletService.signMessage(
      wallet.id,
      dto.deviceShare,
      dto.message
    );
    
    return {
      success: true,
      data: {
        signature,
      }
    };
  }

  /**
   * Migrate from legacy EmbeddedWallet
   */
  @Post('migrate')
  async migrateWallet(
    @Request() req,
    @Body() dto: MigrateWalletDto
  ) {
    const result = await this.walletService.migrateFromPrivateKey(
      req.user.userId,
      dto.privateKey
    );
    
    return {
      success: true,
      data: {
        address: result.address,
        deviceShare: result.deviceShare,
        walletId: result.walletId,
      },
      message: 'Wallet migrated to MPC. Old private key is no longer valid.',
    };
  }

  // ==================== GUARDIANS ====================

  /**
   * Add recovery guardian
   */
  @Post('guardians')
  async addGuardian(
    @Request() req,
    @Body() dto: AddGuardianDto
  ) {
    const wallet = await this.walletService.getWallet(req.user.userId);
    
    const guardian = await this.recoveryService.addGuardian(
      wallet.id,
      dto.guardianType,
      dto.guardianRef,
      dto.guardianName,
      dto.guardianUserId
    );
    
    return {
      success: true,
      data: guardian,
      message: 'Guardian added. They will need to confirm.',
    };
  }

  /**
   * Get my guardians
   */
  @Get('guardians')
  async getGuardians(@Request() req) {
    const wallet = await this.walletService.getWallet(req.user.userId);
    
    const guardians = await this.recoveryService.getGuardians(wallet.id);
    
    return {
      success: true,
      data: guardians,
    };
  }

  /**
   * Suggest guardians based on Arbad
   */
  @Get('guardians/suggest')
  async suggestGuardians(@Request() req) {
    const suggestions = await this.recoveryService.suggestGuardians(req.user.userId);
    
    return {
      success: true,
      data: suggestions,
    };
  }

  // ==================== RECOVERY ====================

  /**
   * Initiate wallet recovery (public - doesn't require auth)
   */
  @Post('recovery/initiate')
  @UseGuards() // Remove auth guard for recovery
  async initiateRecovery(@Body() dto: InitiateRecoveryDto) {
    const session = await this.recoveryService.initiateRecovery(
      dto.address,
      dto.method
    );
    
    return {
      success: true,
      data: {
        sessionId: session.id,
        method: session.method,
        requiredApprovals: session.requiredApprovals,
        expiresAt: session.expiresAt,
      },
      message: 'Recovery initiated. Check your email/phone or contact guardians.',
    };
  }

  /**
   * Confirm recovery with verification code
   */
  @Post('recovery/confirm')
  @UseGuards() // Remove auth guard for recovery
  async confirmRecovery(@Body() dto: ConfirmRecoveryDto) {
    const result = await this.recoveryService.confirmRecovery(
      dto.sessionId,
      dto.verificationCode
    );
    
    return {
      success: true,
      data: result,
    };
  }
}
