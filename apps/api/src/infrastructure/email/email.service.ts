import nodemailer from 'nodemailer';

import type { Environment } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';

export interface EmailService {
  sendEmailVerification(recipient: string, token: string): Promise<void>;
  sendPasswordReset(recipient: string, token: string): Promise<void>;
  sendInvitation(recipient: string, token: string, organisationName: string): Promise<void>;
}

class DisabledEmailService implements EmailService {
  public constructor(private readonly logger: AppLogger) {}

  public sendEmailVerification(recipient: string): Promise<void> {
    this.logger.info({ recipient, type: 'email_verification' }, 'Email delivery is disabled');
    return Promise.resolve();
  }

  public sendPasswordReset(recipient: string): Promise<void> {
    this.logger.info({ recipient, type: 'password_reset' }, 'Email delivery is disabled');
    return Promise.resolve();
  }

  public sendInvitation(recipient: string): Promise<void> {
    this.logger.info({ recipient, type: 'invitation' }, 'Email delivery is disabled');
    return Promise.resolve();
  }
}

class SmtpEmailService implements EmailService {
  private readonly transport;

  public constructor(
    private readonly environment: Environment,
    private readonly logger: AppLogger,
  ) {
    this.transport = nodemailer.createTransport({
      host: environment.SMTP_HOST,
      port: environment.SMTP_PORT,
      secure: environment.SMTP_PORT === 465,
      ...(environment.SMTP_USER && environment.SMTP_PASSWORD
        ? { auth: { user: environment.SMTP_USER, pass: environment.SMTP_PASSWORD } }
        : {}),
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  public async sendEmailVerification(recipient: string, token: string): Promise<void> {
    await this.send(
      recipient,
      'Verify your NexOps AI email',
      `Verify your email: ${this.environment.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`,
    );
  }

  public async sendPasswordReset(recipient: string, token: string): Promise<void> {
    await this.send(
      recipient,
      'Reset your NexOps AI password',
      `Reset your password: ${this.environment.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`,
    );
  }

  public async sendInvitation(
    recipient: string,
    token: string,
    organisationName: string,
  ): Promise<void> {
    await this.send(
      recipient,
      `Join ${organisationName} on NexOps AI`,
      `Accept your invitation: ${this.environment.CLIENT_URL}/accept-invitation?token=${encodeURIComponent(token)}`,
    );
  }

  private async send(recipient: string, subject: string, text: string): Promise<void> {
    try {
      await this.transport.sendMail({
        from: this.environment.SMTP_FROM,
        to: recipient,
        subject,
        text,
      });
    } catch (error) {
      this.logger.error({ err: error, recipient, subject }, 'Email delivery failed');
    }
  }
}

export function createEmailService(environment: Environment, logger: AppLogger): EmailService {
  if (!environment.EMAIL_ENABLED) return new DisabledEmailService(logger);
  return new SmtpEmailService(environment, logger);
}
