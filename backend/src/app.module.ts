import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { LegislativeModule } from './legislative/legislative.module';
import { TaxModule } from './tax/tax.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
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
import { MigrationServiceModule } from './migration-service/migration-service.module';
import { ZagsServiceModule } from './zags-service/zags-service.module';
import { LandRegistryServiceModule } from './land-registry-service/land-registry-service.module';
import { DistributionModule } from './distribution/distribution.module';
import { ArchiveModule } from './archive/archive.module';
import { TransparencyModule } from './transparency/transparency.module';
// Note: LegislativeModule, TaxModule, MarketplaceModule imported above
import { AdminModule } from './admin/admin.module';
import { UnifiedOrgModule } from './unified-org/unified-org.module';
import { NotificationModule } from './notifications/notification.module';
import { MessagingModule } from './messaging/messaging.module';
import { ComplaintModule } from './complaints/complaint.module';
import { WorkActModule } from './work-acts/work-act.module';
import { DisputeModule } from './disputes/dispute.module';
import { ChancelleryModule } from './chancellery/chancellery.module';
import { HierarchyModule } from './hierarchy/hierarchy.module';
import { ParliamentModule } from './parliament/parliament.module';
import { OrgQuestModule } from './org-quests/org-quest.module';
import { RegionalReputationModule } from './regional-reputation/regional-reputation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,   // 60 seconds
      limit: 100,   // 100 requests per IP per minute
    }]),
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
    MigrationServiceModule,  // Migration Service (Passport Office)
    ZagsServiceModule,       // Civil Registry Office (ZAGS)
    LandRegistryServiceModule, // Land and Property Registry
    DistributionModule,  // Initial ALTAN Distribution System
    ArchiveModule,       // State Archive & Document Constructor System
    TransparencyModule,   // Transparency & Accountability System (GOST)
    LegislativeModule,
    TaxModule,
    MarketplaceModule,
    AdminModule,  // Admin and Creator management
    UnifiedOrgModule,  // Unified Organization Management System
    NotificationModule, // In-app Notification System
    MessagingModule,    // Universal Messaging (DM, Group, Org, Case threads)
    ComplaintModule,    // Universal Complaint/Grievance System (hierarchical escalation)
    WorkActModule,      // Universal Work-Act Completion System
    DisputeModule,      // Pre-complaint negotiation (bound to contracts/quests/work-acts)
    ChancelleryModule,  // Contract registry for lawyers and notaries
    HierarchyModule,    // Zun→Myangan→Tumen hierarchy + cooperation
    ParliamentModule,   // Khural sessions and voting (Tumen leaders only)
    OrgQuestModule,     // Organization Task Board (quests/missions for all orgs)
    RegionalReputationModule, // Territorial reputation per republic
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

