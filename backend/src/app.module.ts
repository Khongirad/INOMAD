import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { KhuralModule } from './khural/khural.module';
import { GuildsModule } from './guilds/guilds.module';
import { ProfessionsModule } from './professions/professions.module';
import { TasksModule } from './tasks/tasks.module';
import { SeatBindingModule } from './seat-binding/seat-binding.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { BankModule } from './bank/bank.module';
import { CentralBankModule } from './central-bank/central-bank.module';
import { ArbanModule } from './arbans/arban.module';
import { DigitalSealModule } from './digital-seal/digital-seal.module';
import { AcademyModule } from './academy/academy.module';
import { JusticeModule } from './justice/justice.module';
import { TempleModule } from './temple/temple.module';
import { MPCWalletModule } from './mpc-wallet/mpc-wallet.module';
import { WalletProtectionModule } from './wallet-protection/wallet-protection.module';
import { LegislativeModule } from './legislative/legislative.module';
import { TaxModule } from './tax/tax.module';
import { MarketplaceModule } from './marketplace/marketplace.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    BlockchainModule,
    AuthModule,
    UsersModule,
    KhuralModule,
    GuildsModule,
    ProfessionsModule,
    TasksModule,
    SeatBindingModule,
    AuditModule,
    HealthModule,
    IdentityModule,
    BankModule,
    CentralBankModule,
    ArbanModule,
    DigitalSealModule,
    AcademyModule,
    JusticeModule,
    TempleModule,
    MPCWalletModule,
    WalletProtectionModule,
    LegislativeModule,
    TaxModule,
    MarketplaceModule,
  ],
})
export class AppModule {}

