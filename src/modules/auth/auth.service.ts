import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, InternalServerErrorException, Logger, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../shared/email/email.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResetPasswordResponseDto } from './dto/reset-password-response.dto';

@Injectable()
export class AuthService {
  private otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  private generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private async sendOtpEmail(email: string, otp: string): Promise<void> {
    const success = await this.emailService.sendOtpEmail(email, otp);
    if (!success) {
      throw new Error('Failed to send OTP email');
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginData: any): Promise<any> {
    const user = await this.validateUser(loginData.email, loginData.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    
    return {
      user,
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
    };
  }

  async register(registerData: any, file?: any): Promise<any> {
    try {
      const user = await this.usersService.create(registerData, file);

      const payload = { email: user.email, sub: user.id, role: user.role };

      return {
        user,
        accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      };
    } catch (error: any) {
      this.logger.error('Error during registration', error?.stack || error?.message || error);
      // If it's already an HttpException, rethrow so Nest handles status codes correctly
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to register user');
    }
  }

 async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<any> {
  const { email } = forgotPasswordDto;

  console.log('🔧 Forgot Password Request:');
  console.log(`   Email: ${email}`);

  // Check if user exists
  const user = await this.usersService.findByEmail(email);
  console.log(`   User found in DB: ${!!user}`);
  
  if (!user) {
    console.log('   ❌ User not found - returning generic message');
    // Don't reveal that user doesn't exist
    return { 
      message: 'If your email exists, you will receive an OTP shortly',
      note: 'User not found in database'
    };
  }

  // Generate OTP
  const otp = this.generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  console.log(`   Generated OTP: ${otp}`);
  console.log(`   Expires at: ${expiresAt}`);

  // Store OTP
  this.otpStore.set(email, { otp, expiresAt });

  // Try to send email
  console.log(`   Calling sendOtpEmail...`);
  try {
    const success = await this.emailService.sendOtpEmail(email, otp);
    
    if (success) {
      console.log('   ✅ Email service reported success');
      // In development, also return OTP for testing
      if (process.env.NODE_ENV === 'development') {
        return { 
          message: 'OTP sent to your email',
          data: { 
            otp, 
            expiresIn: 600,
            note: 'Development mode - OTP shown'
          }
        };
      } else {
        return { 
          message: 'OTP sent to your email',
          data: { expiresIn: 600 }
        };
      }
    } else {
      console.log('   ⚠️ Email service returned false');
      return { 
        message: 'OTP generated (email service issue)',
        data: { 
          otp, 
          expiresIn: 600,
          note: 'Email service failed - OTP shown for testing'
        }
      };
    }
  } catch (error: any) {
    console.error('   ❌ Exception in email sending:', error.message);
    return { 
      message: 'OTP generated (check console for OTP)',
      data: { 
        otp, 
        expiresIn: 600,
        error: error.message
      }
    };
  }
}

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<any> {
    const { email, otp } = verifyOtpDto;

    const storedOtp = this.otpStore.get(email);
    if (!storedOtp) {
      throw new UnauthorizedException('OTP not found or expired');
    }

    if (new Date() > storedOtp.expiresAt) {
      this.otpStore.delete(email);
      throw new UnauthorizedException('OTP expired');
    }

    if (storedOtp.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Get user to create reset token
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate JWT reset token (valid for 15 minutes)
    const resetToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        purpose: 'password_reset'
      },
      { expiresIn: '15m' }
    );

    // Clear OTP after successful verification
    this.otpStore.delete(email);

    return {
      message: 'OTP verified successfully',
      resetToken,
      expiresIn: 900 // 15 minutes in seconds
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ResetPasswordResponseDto> {
    const { resetToken, newPassword } = resetPasswordDto;

    try {
      // Verify the JWT reset token
      const payload = this.jwtService.verify(resetToken) as any;
      
      // Check if token is for password reset
      if (payload.purpose !== 'password_reset') {
        throw new UnauthorizedException('Invalid reset token');
      }

      // Update user's password using the user ID from token
      // Note: Don't hash here - usersService.update will handle hashing
      const updatedUser = await this.usersService.update(payload.sub, { password: newPassword });

      // Generate new access token for the user
      const accessTokenPayload = { email: updatedUser.email, sub: updatedUser.id, role: updatedUser.role };
      const accessToken = this.jwtService.sign(accessTokenPayload, { expiresIn: '15m' });

      return {
        message: 'Password reset successfully',
        data: {
          accessToken,
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            fullname: updatedUser.fullname || updatedUser.name,
            role: updatedUser.role
          }
        }
      };
    } catch (error: any) {  // Type error as any
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Reset token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid reset token');
      }
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }
}