import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';

describe('MPC NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();
    service = module.get(NotificationService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('sendVerificationEmail', () => {
    it('logs the email mock (does not throw)', async () => {
      await expect(
        service.sendVerificationEmail('test@example.com', '123456', '0xABC'),
      ).resolves.toBeUndefined();
    });
  });

  describe('sendVerificationSMS', () => {
    it('logs the SMS mock (does not throw)', async () => {
      await expect(
        service.sendVerificationSMS('+1234567890', '789012'),
      ).resolves.toBeUndefined();
    });
  });

  describe('notifyGuardian', () => {
    it('logs guardian notification (does not throw)', async () => {
      await expect(
        service.notifyGuardian(
          'guardian@test.com', 'Guardian', 'Requester',
          '0xWALLET', 'https://approve.link',
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('notifyRecoveryComplete', () => {
    it('logs recovery complete (does not throw)', async () => {
      await expect(
        service.notifyRecoveryComplete('user@test.com', '0xWALLET'),
      ).resolves.toBeUndefined();
    });
  });
});
