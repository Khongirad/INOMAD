import { Test, TestingModule } from '@nestjs/testing';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { AuthGuard } from '../auth/auth.guard';

describe('MessagingController', () => {
  let controller: MessagingController;
  let service: any;
  const req = { user: { id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      getUserConversations: jest.fn().mockResolvedValue([]),
      createDirectMessage: jest.fn().mockResolvedValue({ id: 'c1' }),
      createConversation: jest.fn().mockResolvedValue({ id: 'c2' }),
      getMessages: jest.fn().mockResolvedValue({ messages: [] }),
      sendMessage: jest.fn().mockResolvedValue({ id: 'm1' }),
      addParticipant: jest.fn().mockResolvedValue({ added: true }),
      leaveConversation: jest.fn().mockResolvedValue({ left: true }),
      toggleMute: jest.fn().mockResolvedValue({ muted: true }),
      editMessage: jest.fn().mockResolvedValue({ edited: true }),
      deleteMessage: jest.fn().mockResolvedValue({ deleted: true }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagingController],
      providers: [{ provide: MessagingService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(MessagingController);
    service = module.get(MessagingService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('getConversations', async () => { await controller.getConversations(req); expect(service.getUserConversations).toHaveBeenCalledWith('u1'); });
  it('createDirectMessage', async () => { await controller.createDirectMessage(req, 'u2'); expect(service.createDirectMessage).toHaveBeenCalledWith('u1', 'u2'); });
  it('createConversation', async () => { await controller.createConversation(req, { name: 'G', type: 'GROUP' }); expect(service.createConversation).toHaveBeenCalled(); });
  it('getMessages', async () => { await controller.getMessages(req, 'c1', undefined, '25'); expect(service.getMessages).toHaveBeenCalledWith('u1', 'c1', undefined, 25); });
  it('sendMessage', async () => { await controller.sendMessage(req, 'c1', { body: 'hi' }); expect(service.sendMessage).toHaveBeenCalledWith('u1', 'c1', 'hi', undefined, undefined); });
  it('addParticipant', async () => { await controller.addParticipant(req, 'c1', { userId: 'u2' }); expect(service.addParticipant).toHaveBeenCalledWith('u1', 'c1', 'u2', undefined); });
  it('leaveConversation', async () => { await controller.leaveConversation(req, 'c1'); expect(service.leaveConversation).toHaveBeenCalledWith('u1', 'c1'); });
  it('toggleMute', async () => { await controller.toggleMute(req, 'c1'); expect(service.toggleMute).toHaveBeenCalledWith('u1', 'c1'); });
  it('editMessage', async () => { await controller.editMessage(req, 'm1', 'new text'); expect(service.editMessage).toHaveBeenCalledWith('u1', 'm1', 'new text'); });
  it('deleteMessage', async () => { await controller.deleteMessage(req, 'm1'); expect(service.deleteMessage).toHaveBeenCalledWith('u1', 'm1'); });
});
