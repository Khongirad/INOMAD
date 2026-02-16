import { Test, TestingModule } from '@nestjs/testing';
import { RegionalReputationController } from './regional-reputation.controller';
import { RegionalReputationService } from './regional-reputation.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { ForbiddenException } from '@nestjs/common';

describe('RegionalReputationController', () => {
  let controller: RegionalReputationController;
  let service: any;
  let prisma: any;
  const req = { user: { sub: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      getRegionalProfile: jest.fn().mockResolvedValue({ score: 100 }),
      getUserRegions: jest.fn().mockResolvedValue([]),
      getLeaderboard: jest.fn().mockResolvedValue([]),
      getRecentActions: jest.fn().mockResolvedValue([]),
      getAllRepublicsStats: jest.fn().mockResolvedValue([]),
      awardPoints: jest.fn().mockResolvedValue({ awarded: true }),
    };
    const mockPrisma = {
      user: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegionalReputationController],
      providers: [
        { provide: RegionalReputationService, useValue: mockService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(RegionalReputationController);
    service = module.get(RegionalReputationService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('getMyProfile', async () => { await controller.getMyProfile('r1', req); expect(service.getRegionalProfile).toHaveBeenCalledWith('u1', 'r1'); });
  it('getUserProfile', async () => { await controller.getUserProfile('r1', 'u2'); expect(service.getRegionalProfile).toHaveBeenCalledWith('u2', 'r1'); });
  it('getMyRegions', async () => { await controller.getMyRegions(req); expect(service.getUserRegions).toHaveBeenCalledWith('u1'); });
  it('getLeaderboard', async () => { await controller.getLeaderboard('r1', '10', '0'); expect(service.getLeaderboard).toHaveBeenCalledWith('r1', { limit: 10, offset: 0 }); });
  it('getLeaderboard defaults', async () => { await controller.getLeaderboard('r1'); expect(service.getLeaderboard).toHaveBeenCalledWith('r1', { limit: 20, offset: 0 }); });
  it('getRecentActions', async () => { await controller.getRecentActions('r1', '5'); expect(service.getRecentActions).toHaveBeenCalledWith('r1', 5); });
  it('getAllRepublicsStats', async () => { await controller.getAllRepublicsStats(); expect(service.getAllRepublicsStats).toHaveBeenCalled(); });
  it('awardPoints - creator', async () => { prisma.user.findUnique.mockResolvedValue({ role: 'CREATOR' }); const body = { userId: 'u2', republicId: 'r1', actionType: 'QUEST_COMPLETE' as any, points: 10, description: 'D' }; await controller.awardPoints(req, body); expect(service.awardPoints).toHaveBeenCalled(); });
  it('awardPoints - non-creator throws', async () => { prisma.user.findUnique.mockResolvedValue({ role: 'USER' }); await expect(controller.awardPoints(req, { userId: 'u2', republicId: 'r1', actionType: 'QUEST_COMPLETE' as any, points: 10, description: 'D' })).rejects.toThrow(ForbiddenException); });
  it('awardPoints - user not found throws', async () => { prisma.user.findUnique.mockResolvedValue(null); await expect(controller.awardPoints(req, { userId: 'u2', republicId: 'r1', actionType: 'QUEST_COMPLETE' as any, points: 10, description: 'D' })).rejects.toThrow(ForbiddenException); });
});
