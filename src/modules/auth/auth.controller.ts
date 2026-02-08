import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResetPasswordResponseDto } from './dto/reset-password-response.dto';
import { SendSignupOtpDto } from './dto/send-signup-otp.dto';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-signup-otp')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  @ApiOperation({ summary: 'Send OTP for email verification during signup' })
  @ApiResponse({ status: 200, description: 'OTP sent to email' })
  async sendSignupOtp(@Body() sendSignupOtpDto: SendSignupOtpDto) {
    return this.authService.sendSignupOtp(sendSignupOtpDto);
  }

  @Post('register')
  @UseInterceptors(
    FileInterceptor('ninSlip', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        // Allow common image types and PDFs for NIN slips
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|pdf)$/)) {
          return callback(
            new Error(
              'Only image files (jpg, jpeg, png, webp) or PDF are allowed!',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullname: { type: 'string', example: 'John Doe' },
        email: {
          type: 'string',
          format: 'email',
          example: 'john.doe@example.com',
        },
        password: { type: 'string', example: 'Password123!' },
        phoneNumber: { type: 'string', example: '+1234567890' },
        role: { type: 'string', example: 'tenant' },
        ninSlip: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Register a new user (no token issued - email must be verified)' })
  @ApiResponse({ status: 201, description: 'User registered successfully. OTP sent to email.' })
  async register(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() file?: any,
  ) {
    return this.authService.register(createUserDto, file);
  }

  @Post('login')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        password: { type: 'string', example: 'Password123!' },
        pushNotificationId: { type: 'string', example: 'device_token_xyz', nullable: true },
      },
      required: ['email', 'password'],
    },
  })
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User logged in with access token' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('verify-otp')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        otp: { type: 'string', example: '1234' },
      },
      required: ['email', 'otp'],
    },
  })
  @ApiOperation({ summary: 'Verify OTP (for signup or password reset)' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('forgot-password')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'OTP sent for password reset' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resetToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        newPassword: { type: 'string', example: 'NewPassword123!' },
      },
      required: ['resetToken', 'newPassword'],
    },
  })
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user (clear push notification ID)' })
  @ApiResponse({ status: 200, description: 'User logged out successfully' })
  async logout(@Request() req: any) {
    return this.authService.logout(req.user.id);
  }
}
