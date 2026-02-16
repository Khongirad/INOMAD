import { Test, TestingModule } from '@nestjs/testing';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

describe('InvitationController', () => {
  let controller: InvitationController;
  const req = { user: { id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      sendInvitation: jest.fn().mockResolvedValue({ id: 'i1' }),
      acceptInvitation: jest.fn().mockResolvedValue({ id: 'i1' }),
      rejectInvitation: jest.fn().mockResolvedValue({ id: 'i1' }),
      cancelInvitation: jest.fn().mockResolvedValue({ id: 'i1' }),
      getInvitationsSent: jest.fn().mockResolvedValue([]),
      getInvitationsReceived: jest.fn().mockResolvedValue([]),
      getGuildInvitations: jest.fn().mockResolvedValue([]),
      getInvitationChain: jest.fn().mockResolvedValue([]),
      expireOldInvitations: jest.fn().mockResolvedValue(5),
    };
    const module = await Test.createTestingModule({
      controllers: [InvitationController],
      providers: [{ provide: InvitationService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get(InvitationController);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('sends invitation', async () => { await controller.sendInvitation(req, { guildId: 'g1', inviteeId: 'u2' }); });
  it('accepts invitation', async () => { await controller.acceptInvitation(req, 'i1'); });
  it('rejects invitation', async () => { await controller.rejectInvitation(req, 'i1'); });
  it('cancels invitation', async () => { await controller.cancelInvitation(req, 'i1'); });
  it('gets sent', async () => { await controller.getInvitationsSent(req); });
  it('gets received', async () => { await controller.getInvitationsReceived(req); });
  it('gets received with status', async () => { await controller.getInvitationsReceived(req, 'PENDING' as any); });
  it('gets guild invitations', async () => { await controller.getGuildInvitations(req, 'g1'); });
  it('gets invitation chain', async () => { await controller.getInvitationChain('u1', 'g1'); });
  it('expires old invitations', async () => {
    const r = await controller.expireOldInvitations(30);
    expect(r.expired).toBe(5);
  });
});
