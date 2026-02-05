import { Injectable, Logger } from '@nestjs/common';

/**
 * Mock Notification Service for MVP
 * 
 * In production, replace with real email/SMS service (SendGrid, Twilio, etc.)
 * For now, logs notifications to console for testing.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  /**
   * Send verification code via email (MOCK)
   */
  async sendVerificationEmail(
    email: string,
    code: string,
    walletAddress: string
  ): Promise<void> {
    this.logger.log(`
╔═══════════════════════════════════════════════════════════════╗
║               [MOCK EMAIL] Recovery Verification              ║
╠═══════════════════════════════════════════════════════════════╣
║ To: ${email.padEnd(58)}║
║ Subject: INOMAD Wallet Recovery                               ║
║                                                               ║
║ Your recovery verification code is:                          ║
║                                                               ║
║              ${code.padEnd(51)}║
║                                                               ║
║ Wallet: ${walletAddress.slice(0, 42).padEnd(54)}║
║                                                               ║
║ This code expires in 24 hours.                               ║
║ Do not share this code with anyone.                          ║
╚═══════════════════════════════════════════════════════════════╝
    `);

    // In production, use SendGrid:
    // await this.sendGridService.send({
    //  to: email,
    //  subject: 'INOMAD Wallet Recovery',
    //   text: `Your verification code is: ${code}`,
    //   html: this.generateEmailTemplate(code, walletAddress),
    // });
  }

  /**
   * Send verification code via SMS (MOCK
)
   */
  async sendVerificationSMS(
    phoneNumber: string,
    code: string
  ): Promise<void> {
    this.logger.log(`
╔═══════════════════════════════════════════════════════════════╗
║                [MOCK SMS] Recovery Verification               ║
╠═══════════════════════════════════════════════════════════════╣
║ To: ${phoneNumber.padEnd(58)}║
║                                                               ║
║ INOMAD Wallet Recovery                                        ║
║ Your code: ${code.padEnd(52)}║
║ Expires in 24h. Do not share.                                ║
╚═══════════════════════════════════════════════════════════════╝
    `);

    // In production, use Twilio:
    // await this.twilioService.messages.create({
    //   to: phoneNumber,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   body: `INOMAD Wallet Recovery: Your verification code is ${code}. Expires in 24h.`,
    // });
  }

  /**
   * Notify guardian about recovery request (MOCK)
   */
  async notifyGuardian(
    guardianEmail: string,
    guardianName: string,
    requesterName: string,
    walletAddress: string,
    approvalLink: string
  ): Promise<void> {
    this.logger.log(`
╔═══════════════════════════════════════════════════════════════╗
║          [MOCK EMAIL] Guardian Recovery Approval Request      ║
╠═══════════════════════════════════════════════════════════════╣
║ To: ${guardianEmail.padEnd(58)}║
║ Subject: Wallet Recovery Approval Needed                      ║
║                                                               ║
║ Hello ${guardianName.padEnd(56)}║
║                                                               ║
║ ${requesterName.padEnd(58)} has initiated recovery for:     ║
║ Wallet: ${walletAddress.slice(0, 42).padEnd(54)}║
║                                                               ║
║ As a trusted guardian, your approval is needed.              ║
║                                                               ║
║ Approval link (MVP - copy to browser):                       ║
║ ${approvalLink.slice(0, 62).padEnd(62)}║
║                                                               ║
║ Only approve if you recognize this request.                  ║
╚═══════════════════════════════════════════════════════════════╝
    `);

    // In production:
    // await this.sendGridService.send({
    //   to: guardianEmail,
    //   subject: 'Wallet Recovery Approval Needed',
    //   html: this.generateGuardianEmailTemplate(...),
    // });
  }

  /**
   * Send recovery completion notification (MOCK)
   */
  async notifyRecoveryComplete(
    email: string,
    walletAddress: string
  ): Promise<void> {
    this.logger.log(`
╔═══════════════════════════════════════════════════════════════╗
║           [MOCK EMAIL] Wallet Recovery Completed              ║
╠═══════════════════════════════════════════════════════════════╣
║ To: ${email.padEnd(58)}║
║ Subject: Wallet Recovery Successful                           ║
║                                                               ║
║ Your wallet recovery has been completed successfully.        ║
║                                                               ║
║ Wallet: ${walletAddress.slice(0, 42).padEnd(54)}║
║                                                               ║
║ You can now set up a new device share.                       ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  }
}
