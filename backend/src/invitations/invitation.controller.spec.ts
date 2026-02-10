import { Test, TestingModule } from '@nestjs/testing';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

describe('InvitationController', () => {
  let controller: InvitationController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationController],
      providers: [
        { provide: InvitationService, useValue: { sendInvitation: jest.fn(), getSentInvitations: jest.fn().mockResolvedValue([]) } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<InvitationController>(InvitationController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
