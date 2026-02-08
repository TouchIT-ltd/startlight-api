import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, LibraryResponse, SendEmailV3_1 } from 'node-mailjet';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private mailjet: Client;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('MAILJET_API_KEY');
    const secretKey = this.configService.get<string>('MAILJET_SECRET_KEY');

    if (apiKey && secretKey) {
      this.mailjet = new Client({
        apiKey,
        apiSecret: secretKey,
      });
      this.logger.log('✅ Mailjet email service initialized');
    } else {
      this.logger.warn(
        '⚠️ Mailjet credentials not configured. Email service in development mode.',
      );
      // Create dummy client for dev
      this.mailjet = new Client({
        apiKey: 'dummy',
        apiSecret: 'dummy',
      });
    }
  }

  async sendOtpEmail(to: string, otp: string): Promise<boolean> {
    return this.sendPasswordResetEmail(to, otp);
  }

  async sendSignupOtpEmail(to: string, otp: string): Promise<boolean> {
    const subject = 'Verify Your Email - Starlight App';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0;">✉️ Email Verification</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Starlight App</p>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Welcome to Starlight!</h2>
          <p>Thank you for signing up. To complete your registration, please verify your email using the code below:</p>
          
          <div style="background: white; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; border: 2px dashed #667eea;">
            <p style="font-size: 14px; color: #666; margin: 0 0 10px;">Your verification code:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea; margin: 10px 0;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #999; margin: 10px 0 0;">
              Expires in 10 minutes
            </p>
          </div>

          <p>If you didn't create this account, please ignore this email.</p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
            <p>This is an automated message from Starlight App.</p>
            <p>Need help? Contact: support@starlightapp.com</p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  async sendWelcomeEmail(
    to: string,
    fullname: string,
  ): Promise<boolean> {
    const subject = 'Welcome to Starlight - Account Verified';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0;">🎉 Welcome</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Starlight App</p>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Hello ${fullname}!</h2>
          <p>Your email has been successfully verified. Your account is now active and ready to use.</p>
          
          <p>You can now log in to your account and start managing your properties and rentals.</p>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${this.configService.get('APP_URL') || 'https://starlightapp.com'}/login" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Log In Now
            </a>
          </div>

          <p>If you have any questions, feel free to contact our support team.</p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
            <p>This is an automated message from Starlight App.</p>
            <p>Need help? Contact: support@starlightapp.com</p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  async sendPasswordResetEmail(to: string, otp: string): Promise<boolean> {
    const subject = 'Reset Your Password - Starlight App';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0;">🔐 Password Reset</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Starlight App</p>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Reset Your Password</h2>
          <p>We received a request to reset your password. Use the code below to proceed:</p>
          
          <div style="background: white; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; border: 2px dashed #667eea;">
            <p style="font-size: 14px; color: #666; margin: 0 0 10px;">Your reset code:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea; margin: 10px 0;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #999; margin: 10px 0 0;">
              Expires in 10 minutes
            </p>
          </div>

          <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
            <p>This is an automated message from Starlight App.</p>
            <p>Need help? Contact: support@starlightapp.com</p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
  ): Promise<boolean> {
    if (!this.mailjet) {
      this.logger.warn(
        `📧 [FALLBACK] No Mailjet - Email to ${to} - Subject: ${subject}`,
      );
      return true;
    }

    try {
      this.logger.debug(`Sending email to ${to} with subject "${subject}"`);

      const body: SendEmailV3_1.Body = {
        Messages: [
          {
            From: {
              Email:
                this.configService.get<string>('EMAIL_FROM') ??
                'noreply@touchit.click',
              Name:
                this.configService.get<string>('EMAIL_FROM_NAME') ??
                'Touch I.T - Auth',
            },
            To: [{ Email: to }],
            Subject: subject,
            HTMLPart: htmlBody,
          },
        ],
      };

      await this.mailjet.post('send', { version: 'v3.1' }).request(body);

      this.logger.log(`✅ Email sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`❌ Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  }
}
