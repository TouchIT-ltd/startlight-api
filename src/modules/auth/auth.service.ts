import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  HttpException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../shared/email/email.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResetPasswordResponseDto } from './dto/reset-password-response.dto';
import { SendSignupOtpDto } from './dto/send-signup-otp.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

// Define return interfaces for better type safety
export interface AuthResponse {
  user: any; // Ideally this should be a User interface
  accessToken?: string;
  message?: string;
  otpDetails?: OtpResponse; // Details for dev or debugging
}

export interface OtpResponse {
  message: string;
  data?: {
    otp?: string;
    expiresIn: number;
    note?: string;
    error?: string;
  };
  resetToken?: string;
  expiresIn?: number;
  user?: any; // User object
}

@Injectable()
export class AuthService {
  // Store OTP with purpose: 'signup' or 'password_reset'
  private otpStore: Map<
    string,
    {
      otp: string;
      expiresAt: Date;
      purpose: 'signup' | 'password_reset';
    }
  > = new Map();
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) { }

  private generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /*
   * Helper method to generate and send OTP
   */
  private async generateAndSendOtp(
    email: string,
    purpose: 'signup' | 'password_reset',
  ): Promise<OtpResponse> {
    // Generate OTP
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    this.logger.log(`Generated OTP for ${purpose}: ${otp} (Expires: ${expiresAt})`);

    // Store OTP
    this.otpStore.set(email, { otp, expiresAt, purpose });

    // Try to send email
    try {
      let success = false;
      if (purpose === 'signup') {
        success = await this.emailService.sendSignupOtpEmail(email, otp);
      } else {
        success = await this.emailService.sendOtpEmail(email, otp);
      }

      const isDev = process.env.NODE_ENV === 'development';

      if (success) {
        return {
          message: 'OTP sent to your email',
          data: isDev ? {
            otp,
            expiresIn: 600,
            note: 'Development mode - OTP shown'
          } : { expiresIn: 600 },
        };
      } else {
        this.logger.warn(`Email service returned false for ${email}`);
        return {
          message: 'OTP generated (email service issue)',
          data: {
            otp, // Return OTP if email fails so testing can continue
            expiresIn: 600,
            note: 'Email service failed - OTP shown for testing',
          },
        };
      }
    } catch (error: any) {
      this.logger.error(`Exception in email sending: ${error.message}`);
      return {
        message: 'OTP generated (check console/logs)',
        data: {
          otp,
          expiresIn: 600,
          error: error.message,
        },
      };
    }
  }

  // Deprecated or Internal Use if needed, but logic is primarily in register now
  async sendSignupOtp(sendSignupOtpDto: SendSignupOtpDto): Promise<OtpResponse> {
    const { email } = sendSignupOtpDto;

    // Check if user already exists and is verified
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser && existingUser.emailVerified) {
      throw new BadRequestException('User with this email already exists');
    }

    return this.generateAndSendOtp(email, 'signup');
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (user && (await bcrypt.compare(password, user.password))) {
      // Check if email is verified
      // Explicit false check prevents string bugs
      if (user.emailVerified === false || user.emailVerified === 'false') {
        throw new UnauthorizedException(
          'Please verify your email before logging in',
        );
      }

      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Save pushNotificationId if provided
    if (loginDto.pushNotificationId) {
      await this.usersService.update(user.id, {
        pushNotificationId: loginDto.pushNotificationId,
      });
    }

    const payload = { email: user.email, sub: user.id, role: user.role };

    return {
      user,
      accessToken: this.jwtService.sign(payload, {
        expiresIn: this.configService.get('config.jwt.expiration'),
      }),
    };
  }

  async register(createUserDto: CreateUserDto, file?: Express.Multer.File): Promise<any> {
    try {
      const email = createUserDto.email.toLowerCase();
      createUserDto.email = email;
      
      const existingUser = await this.usersService.findByEmail(email);
      if (existingUser) {
        if (existingUser.emailVerified === false || existingUser.emailVerified === 'false') {
          this.logger.log(`Resending OTP for unverified existing user: ${existingUser.email}`);
          const otpResponse = await this.generateAndSendOtp(existingUser.email, 'signup');
          return {
            message: 'Account pending verification. New OTP sent.',
            user: {
              id: existingUser.id,
              email: existingUser.email,
              fullname: existingUser.fullname,
              role: [existingUser.role],
              emailVerified: existingUser.emailVerified,
            },
            otpDetails: otpResponse
          };
        }
        throw new ConflictException('User with this email already exists');
      }

      // 2. Create user with emailVerified: false
      const user = await this.usersService.create(createUserDto, file);

      // 3. Automatically send OTP
      this.logger.log(`User registered: ${user.email}. Sending OTP...`);
      const otpResponse = await this.generateAndSendOtp(user.email, 'signup');

      // 4. Return combined response
      return {
        message: 'Registration successful. OTP sent to email.',
        user: {
          id: user.id,
          email: user.email,
          fullname: user.fullname,
          role: [user.role],
          emailVerified: user.emailVerified,
        },
        otpDetails: otpResponse // Include OTP details (msg, debug info)
      };

    } catch (error: any) {
      this.logger.error(
        'Error during registration',
        error?.stack || error?.message || error,
      );
      // If it's already an HttpException, rethrow so Nest handles status codes correctly
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to register user');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<OtpResponse> {
    const { email } = forgotPasswordDto;

    // Check if user exists
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal that user doesn't exist for security
      return {
        message: 'If your email exists, you will receive an OTP shortly',
        data: { expiresIn: 0, note: 'User not found' }
      };
    }

    return this.generateAndSendOtp(email, 'password_reset');
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<OtpResponse> {
    const { email, otp } = verifyOtpDto;

    const storedOtpData = this.otpStore.get(email);
    if (!storedOtpData) {
      throw new UnauthorizedException('OTP not found or expired');
    }

    if (new Date() > storedOtpData.expiresAt) {
      this.otpStore.delete(email);
      throw new UnauthorizedException('OTP expired. Please request a new one.');
    }

    if (storedOtpData.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Get user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Handle based on purpose
    if (storedOtpData.purpose === 'signup') {
      // Mark email as verified
      const updatedUser = await this.usersService.update(user.id, {
        emailVerified: true,
      });

      // Send welcome email
      await this.emailService.sendWelcomeEmail(
        updatedUser.email,
        updatedUser.fullname,
      );

      // Clear OTP after successful verification
      this.otpStore.delete(email);

      return {
        message: 'Email verified successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullname: updatedUser.fullname,
          role: [updatedUser.role],
          emailVerified: updatedUser.emailVerified,
        },
      };
    } else if (storedOtpData.purpose === 'password_reset') {
      // Generate JWT reset token for password reset
      const resetToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          purpose: 'password_reset',
        },
        { expiresIn: '15m' },
      );

      // Clear OTP after successful verification
      this.otpStore.delete(email);

      return {
        message: 'OTP verified successfully',
        resetToken,
        expiresIn: 900, // 15 minutes in seconds
      };
    } else {
      throw new BadRequestException('Invalid OTP purpose');
    }
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    const { resetToken, newPassword } = resetPasswordDto;

    try {
      // Verify the JWT reset token
      const payload = this.jwtService.verify(resetToken);

      // Check if token is for password reset
      if (payload.purpose !== 'password_reset') {
        throw new UnauthorizedException('Invalid reset token');
      }

      // Update user's password using the user ID from token
      const updatedUser = await this.usersService.update(payload.sub, {
        password: newPassword,
      });

      // Generate new access token for the user
      const accessTokenPayload = {
        email: updatedUser.email,
        sub: updatedUser.id,
        role: updatedUser.role,
      };
      const accessToken = this.jwtService.sign(accessTokenPayload, {
        expiresIn: this.configService.get('config.jwt.expiration'),
      });

      return {
        message: 'Password reset successfully',
        data: {
          accessToken,
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            fullname: updatedUser.fullname || updatedUser.name,
            role: updatedUser.role,
          },
        },
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Reset token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid reset token');
      }
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    // Clear pushNotificationId on logout
    await this.usersService.update(userId, {
      pushNotificationId: null,
    });

    return {
      message: 'Logged out successfully',
    };
  }

  async resendOtp(resendOtpDto: ResendOtpDto): Promise<OtpResponse> {
    const { email, purpose } = resendOtpDto;
    
    // Check if user exists
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (purpose === 'signup' && (user.emailVerified === true || user.emailVerified === 'true')) {
      throw new BadRequestException('User is already verified');
    }

    return this.generateAndSendOtp(email, purpose);
  }
}
