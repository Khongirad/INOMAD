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
// Temporarily disabled due to TS errors - not needed for Gates of Khural
// import { TempleModule } from './temple/temple.module';
import { MPCWalletModule } from './mpc-wallet/mpc-wallet.module';
import { WalletProtectionModule } from './wallet-protection/wallet-protection.module';
import { VerificationModule } from './verification/verification.module';
import { TimelineModule } from './timeline/timeline.module';
import { HistoryModule } from './history/history.module';
import { CalendarModule } from './calendar/calendar.module';
import { ReputationModule } from './reputation/reputation.module';
// import { DocumentModule } from './documents/document.module'; // Disabled - replaced by State Archive
import { QuestModule } from './quests/quest.module';
import { OrganizationModule } from './organizations/organization.module';
import { EducationModule } from './education/education.module';
import { InvitationModule } from './invitations/invitation.module';
import { ElectionModule } from './elections/election.module';
// import { MigrationServiceModule } from './migration-service/migration-service.module';
// import { ZagsServiceModule } from './zags-service/zags-service.module';
// import { LandRegistryServiceModule } from './land-registry-service/land-registry-service.module';
import { DistributionModule } from './distribution/distribution.module';
import { ArchiveModule } from './archive/archive.module';
import { TransparencyModule } from './transparency/transparency.module';
// import { LegislativeModule } from './legislative/legislative.module';
// import { TaxModule } from './tax/tax.module';
// import { MarketplaceModule } from './marketplace/marketplace.module';
import { AdminModule } from './admin/admin.module';

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
    // TempleModule,  // Disabled - TS errors
    MPCWalletModule,
    WalletProtectionModule,
    VerificationModule,
    TimelineModule,
    HistoryModule,
    CalendarModule,
    ReputationModule,  // Reputation & Trust system
    // DocumentModule,    // Document management & signing - DISABLED (replaced by ArchiveModule)
    QuestModule,       // Quest/Task assignment system
    OrganizationModule, // Guild & Organization Rating System
    EducationModule,    // Education verification for guilds
    InvitationModule,    // Guild invitation system
    ElectionModule,      // Leader election system
    // MigrationServiceModule,  // Migration Service (Passport Office) - TEMP DISABLED
    // ZagsServiceModule,      // Civil Registry Office (ZAGS) - TEMP DISABLED
    // LandRegistryServiceModule, // Land and Property Registry - TEMP DISABLED
    DistributionModule,  // Initial ALTAN Distribution System
    ArchiveModule,       // State Archive & Document Constructor System
    TransparencyModule,   // Transparency & Accountability System (GOST)
    // LegislativeModule,  // Disabled - TS errors
    // TaxModule,  // Disabled - TS errors
    // MarketplaceModule,  // Disabled - TS errors
    AdminModule,  // Admin and Creator management
  ],
})
export class AppModule {}

