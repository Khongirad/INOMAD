import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * KhuralGateway — Central WebSocket gateway for INOMAD KHURAL OS.
 *
 * Channels:
 *   • khural:votes       — live vote tallies
 *   • khural:proposals   — new proposal broadcasts
 *   • khural:news        — breaking news / announcements
 *   • citizen:xp         — XP / level-up notifications
 *   • citizen:onboarding — onboarding step completions
 *   • marketplace:listing — new listings
 *   • zags:marriage      — marriage registrations
 *   • justice:case       — case updates
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws',
})
export class KhuralGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(KhuralGateway.name);
  private connectedClients = new Map<string, { userId?: string; joinedAt: Date }>();

  afterInit() {
    this.logger.log('🌐 KhuralGateway initialized');
  }

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, { joinedAt: new Date() });
    this.logger.log(`Client connected: ${client.id} (total: ${this.connectedClients.size})`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id} (total: ${this.connectedClients.size})`);
  }

  // ============ Client → Server Messages ============

  /**
   * Client authenticates with their userId.
   */
  @SubscribeMessage('auth')
  handleAuth(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const entry = this.connectedClients.get(client.id);
    if (entry) {
      entry.userId = data.userId;
      // Join personal room for targeted notifications
      client.join(`user:${data.userId}`);
      this.logger.log(`Client ${client.id} authenticated as ${data.userId}`);
    }
    return { event: 'auth', data: { success: true } };
  }

  /**
   * Client joins a specific channel (e.g., proposal room, org room).
   */
  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    client.join(data.room);
    this.logger.debug(`Client ${client.id} joined room: ${data.room}`);
    return { event: 'joined', data: { room: data.room } };
  }

  /**
   * Client leaves a channel.
   */
  @SubscribeMessage('leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    client.leave(data.room);
    return { event: 'left', data: { room: data.room } };
  }

  // ============ Server → Client Broadcasts ============

  /**
   * Broadcast a vote update to everyone watching a proposal.
   */
  broadcastVoteUpdate(proposalId: string, voteData: any) {
    this.server.to(`proposal:${proposalId}`).emit('khural:votes', {
      proposalId,
      ...voteData,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast a new proposal to all connected clients.
   */
  broadcastNewProposal(proposal: any) {
    this.server.emit('khural:proposals', {
      type: 'NEW_PROPOSAL',
      proposal,
      timestamp: new Date(),
    });
  }

  /**
   * Send XP / level-up notification to a specific user.
   */
  notifyXPEarned(userId: string, xpData: { amount: number; action: string; newLevel?: number; newTitle?: string }) {
    this.server.to(`user:${userId}`).emit('citizen:xp', {
      ...xpData,
      timestamp: new Date(),
    });
  }

  /**
   * Notify user of onboarding step completion.
   */
  notifyOnboardingStep(userId: string, stepData: { stepKey: string; xpAwarded: number; allComplete: boolean }) {
    this.server.to(`user:${userId}`).emit('citizen:onboarding', {
      ...stepData,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast a breaking news item to all clients.
   */
  broadcastNews(newsItem: any) {
    this.server.emit('khural:news', {
      type: 'BREAKING',
      ...newsItem,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast new marketplace listing.
   */
  broadcastNewListing(listing: any) {
    this.server.emit('marketplace:listing', {
      type: 'NEW_LISTING',
      listing,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast marriage registration.
   */
  broadcastMarriage(marriageData: any) {
    this.server.emit('zags:marriage', {
      type: 'REGISTERED',
      ...marriageData,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast case update.
   */
  broadcastCaseUpdate(caseData: any) {
    this.server.emit('justice:case', {
      type: 'UPDATE',
      ...caseData,
      timestamp: new Date(),
    });
  }

  /**
   * Get connection stats.
   */
  getConnectionStats() {
    return {
      totalConnections: this.connectedClients.size,
      authenticatedUsers: [...this.connectedClients.values()].filter((c) => c.userId).length,
    };
  }
}
