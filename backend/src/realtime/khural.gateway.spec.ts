import { KhuralGateway } from './khural.gateway';

describe('KhuralGateway', () => {
  let gateway: KhuralGateway;
  let mockServer: any;
  let mockClient: any;

  beforeEach(() => {
    gateway = new KhuralGateway();
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    (gateway as any).server = mockServer;
    mockClient = {
      id: 'client1',
      join: jest.fn(),
      leave: jest.fn(),
    };
  });

  it('should be defined', () => expect(gateway).toBeDefined());

  it('afterInit logs', () => { gateway.afterInit(); });

  it('handleConnection tracks client', () => {
    gateway.handleConnection(mockClient);
    expect((gateway as any).connectedClients.size).toBe(1);
  });

  it('handleDisconnect removes client', () => {
    gateway.handleConnection(mockClient);
    gateway.handleDisconnect(mockClient);
    expect((gateway as any).connectedClients.size).toBe(0);
  });

  describe('handleAuth', () => {
    it('authenticates client and joins room', () => {
      gateway.handleConnection(mockClient);
      const result = gateway.handleAuth(mockClient, { userId: 'u1' });
      expect(mockClient.join).toHaveBeenCalledWith('user:u1');
      expect(result).toEqual({ event: 'auth', data: { success: true } });
    });

    it('handles unknown client', () => {
      const result = gateway.handleAuth(mockClient, { userId: 'u1' });
      expect(result).toEqual({ event: 'auth', data: { success: true } });
    });
  });

  it('handleJoin', () => {
    const r = gateway.handleJoin(mockClient, { room: 'proposal:1' });
    expect(mockClient.join).toHaveBeenCalledWith('proposal:1');
    expect(r).toEqual({ event: 'joined', data: { room: 'proposal:1' } });
  });

  it('handleLeave', () => {
    const r = gateway.handleLeave(mockClient, { room: 'proposal:1' });
    expect(mockClient.leave).toHaveBeenCalledWith('proposal:1');
    expect(r).toEqual({ event: 'left', data: { room: 'proposal:1' } });
  });

  it('broadcastVoteUpdate', () => {
    gateway.broadcastVoteUpdate('p1', { for: 5 });
    expect(mockServer.to).toHaveBeenCalledWith('proposal:p1');
    expect(mockServer.emit).toHaveBeenCalledWith('khural:votes', expect.objectContaining({ proposalId: 'p1', for: 5 }));
  });

  it('broadcastNewProposal', () => {
    gateway.broadcastNewProposal({ id: 'p1' });
    expect(mockServer.emit).toHaveBeenCalledWith('khural:proposals', expect.objectContaining({ type: 'NEW_PROPOSAL' }));
  });

  it('notifyXPEarned', () => {
    gateway.notifyXPEarned('u1', { amount: 100, action: 'vote' });
    expect(mockServer.to).toHaveBeenCalledWith('user:u1');
    expect(mockServer.emit).toHaveBeenCalledWith('citizen:xp', expect.objectContaining({ amount: 100 }));
  });

  it('notifyOnboardingStep', () => {
    gateway.notifyOnboardingStep('u1', { stepKey: 'step1', xpAwarded: 50, allComplete: false });
    expect(mockServer.to).toHaveBeenCalledWith('user:u1');
  });

  it('broadcastNews', () => {
    gateway.broadcastNews({ title: 'News!' });
    expect(mockServer.emit).toHaveBeenCalledWith('khural:news', expect.objectContaining({ type: 'BREAKING' }));
  });

  it('broadcastNewListing', () => {
    gateway.broadcastNewListing({ id: 'l1' });
    expect(mockServer.emit).toHaveBeenCalledWith('marketplace:listing', expect.objectContaining({ type: 'NEW_LISTING' }));
  });

  it('broadcastMarriage', () => {
    gateway.broadcastMarriage({ couple: 'A+B' });
    expect(mockServer.emit).toHaveBeenCalledWith('zags:marriage', expect.objectContaining({ type: 'REGISTERED' }));
  });

  it('broadcastCaseUpdate', () => {
    gateway.broadcastCaseUpdate({ caseId: 'c1' });
    expect(mockServer.emit).toHaveBeenCalledWith('justice:case', expect.objectContaining({ type: 'UPDATE' }));
  });

  it('getConnectionStats', () => {
    gateway.handleConnection(mockClient);
    gateway.handleAuth(mockClient, { userId: 'u1' });
    const stats = gateway.getConnectionStats();
    expect(stats.totalConnections).toBe(1);
    expect(stats.authenticatedUsers).toBe(1);
  });
});
