import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * AlertService - Notification and Alert Management
 * 
 * Handles:
 * - Risk level notifications
 * - Judicial freeze alerts
 * - Admin notifications
 * - Audit logging
 */
@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  // Alert storage (in production, this would go to DB/external system)
  private alerts: AlertRecord[] = [];
  private readonly MAX_ALERTS = 1000;

  constructor(private configService: ConfigService) {}

  /**
   * Send high risk alert (score >= 80)
   */
  async sendHighRiskAlert(
    wallet: string,
    score: number,
    patterns: string[],
  ) {
    const alert: AlertRecord = {
      id: this.generateId(),
      level: 'HIGH',
      type: 'risk_score',
      wallet,
      message: `High risk detected: score ${score}`,
      details: { score, patterns },
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.addAlert(alert);
    this.logger.error(`🚨 HIGH RISK ALERT: ${wallet} (score: ${score})`);
    
    // In production: send to monitoring dashboard, Slack, email, etc.
    await this.notifyAdmins(alert);
  }

  /**
   * Send medium risk alert (score 50-79)
   */
  async sendMediumRiskAlert(
    wallet: string,
    score: number,
    patterns: string[],
  ) {
    const alert: AlertRecord = {
      id: this.generateId(),
      level: 'MEDIUM',
      type: 'risk_score',
      wallet,
      message: `Medium risk detected: score ${score}`,
      details: { score, patterns },
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.addAlert(alert);
    this.logger.warn(`⚠️  MEDIUM RISK: ${wallet} (score: ${score})`);
  }

  /**
   * Send low risk alert (score 30-49)
   */
  async sendLowRiskAlert(
    wallet: string,
    score: number,
    patterns: string[],
  ) {
    const alert: AlertRecord = {
      id: this.generateId(),
      level: 'LOW',
      type: 'risk_score',
      wallet,
      message: `Low risk detected: score ${score}`,
      details: { score, patterns },
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.addAlert(alert);
    this.logger.log(`ℹ️  LOW RISK: ${wallet} (score: ${score})`);
  }

  /**
   * Send manual lock notification
   */
  async sendManualLockNotification(
    wallet: string,
    reason: string,
    lockedBy: string,
  ) {
    const alert: AlertRecord = {
      id: this.generateId(),
      level: 'HIGH',
      type: 'manual_lock',
      wallet,
      message: `Manual lock by ${lockedBy}`,
      details: { reason, lockedBy },
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.addAlert(alert);
    this.logger.warn(`🔒 MANUAL LOCK: ${wallet} by ${lockedBy} - ${reason}`);
  }

  /**
   * Send judicial freeze request notification
   */
  async sendJudicialFreezeRequest(
    wallet: string,
    caseHash: string,
    requestedBy: string,
  ) {
    const alert: AlertRecord = {
      id: this.generateId(),
      level: 'CRITICAL',
      type: 'judicial_freeze',
      wallet,
      message: `Judicial freeze requested by ${requestedBy}`,
      details: { caseHash, requestedBy },
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.addAlert(alert);
    this.logger.error(`⚖️  JUDICIAL FREEZE REQUEST: ${wallet}`);
    
    // Notify judges
    await this.notifyJudges(alert);
  }

  /**
   * Notify admin team
   */
  private async notifyAdmins(alert: AlertRecord) {
    // In production:
    // - Send to Slack/Discord webhook
    // - Send email to security team
    // - Push to monitoring dashboard (Grafana, DataDog, etc.)
    
    this.logger.log(`[ADMIN NOTIFICATION] ${alert.level}: ${alert.message}`);
  }

  /**
   * Notify judges for judicial actions
   */
  private async notifyJudges(alert: AlertRecord) {
    // In production:
    // - Send to Council of Justice dashboard
    // - Email judges
    
    this.logger.log(`[JUDGE NOTIFICATION] ${alert.type}: ${alert.message}`);
  }

  /**
   * Add alert to storage
   */
  private addAlert(alert: AlertRecord) {
    this.alerts.unshift(alert);
    
    // Trim old alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
    }
  }

  /**
   * Get recent alerts
   */
  getAlerts(options?: {
    level?: AlertLevel;
    type?: AlertType;
    wallet?: string;
    limit?: number;
    unacknowledgedOnly?: boolean;
  }): AlertRecord[] {
    let filtered = this.alerts;

    if (options?.level) {
      filtered = filtered.filter(a => a.level === options.level);
    }
    if (options?.type) {
      filtered = filtered.filter(a => a.type === options.type);
    }
    if (options?.wallet) {
      filtered = filtered.filter(a => a.wallet === options.wallet);
    }
    if (options?.unacknowledgedOnly) {
      filtered = filtered.filter(a => !a.acknowledged);
    }

    return filtered.slice(0, options?.limit || 50);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();
    }
  }

  /**
   * Get alert statistics
   */
  getStats() {
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recent = this.alerts.filter(a => a.timestamp > last24h);

    return {
      total: this.alerts.length,
      last24Hours: {
        total: recent.length,
        high: recent.filter(a => a.level === 'HIGH').length,
        medium: recent.filter(a => a.level === 'MEDIUM').length,
        low: recent.filter(a => a.level === 'LOW').length,
        critical: recent.filter(a => a.level === 'CRITICAL').length,
      },
      unacknowledged: this.alerts.filter(a => !a.acknowledged).length,
    };
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Types
type AlertLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type AlertType = 'risk_score' | 'manual_lock' | 'judicial_freeze' | 'blacklist' | 'system';

interface AlertRecord {
  id: string;
  level: AlertLevel;
  type: AlertType;
  wallet: string;
  message: string;
  details: Record<string, any>;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}

export { AlertRecord, AlertLevel, AlertType };
