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
import { GamificationModule } from './gamification/gamification.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { TaxModule } from './tax/tax.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { MPCWalletModule } from './mpc-wallet/mpc-wallet.module';
import { WalletProtectionModule } from './wallet-protection/wallet-protection.module';
import { VerificationModule } from './verification/verification.module';
import { TimelineModule } from './timeline/timeline.module';
import { HistoryModule } from './history/history.module';
import { CalendarModule } from './calendar/calendar.module';
import { CensusModule } from './census/census.module';
import { ReputationModule } from './reputation/reputation.module';
// import { DocumentModule } from './documents/document.module'; // Disabled - replaced by State Archive
import { QuestModule } from './quest/quest.module';
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
import { CreatorModeModule } from './creator-mode/creator-mode.module';
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
import { OrgBankingModule } from './org-banking/org-banking.module';
import { RealtimeModule } from './realtime/realtime.module';
import { NewsModule } from './news/news.module';
import { CitizenshipModule } from './citizenship/citizenship.module';
import { PublicSquareModule } from './public-square/public-square.module';
import { CIKModule } from './cik/cik.module';
import { GovernanceModule } from './governance/governance.module';
import { JudicialModule } from './judicial/judicial.module';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

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
    CensusModule,
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
    GamificationModule,  // Citizen XP, Levels, Achievements
    OnboardingModule,    // Guided onboarding quest "Путь Гражданина"
    TaxModule,
    MarketplaceModule,
    AdminModule,  // Admin and Creator management
    UnifiedOrgModule,  // Unified Organization Management System
    CreatorModeModule, // Creator provisional governance + Transfer of Power
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
    OrgBankingModule,   // Org banking with dual authorization & daily reports
    RealtimeModule,
    NewsModule,
    CitizenshipModule,
    PublicSquareModule, // Народная площадь — debates & petitions at every hierarchy level
    CIKModule,          // Центральная Избирательная Комиссия + Khural elections
    GovernanceModule,   // Public governance state snapshot API
    JudicialModule,     // Judicial system: cases, hearings, verdicts
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

