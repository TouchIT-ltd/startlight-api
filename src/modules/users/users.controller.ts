import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles, UserRole } from '../../shared/decorators/roles.decorator';
import { Public } from '../../shared/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
// Re-trigger build
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @Public()
  @ApiTags('Authentication')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullname: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        password: { type: 'string', example: 'Password123!' },
        phoneNumber: { type: 'string', example: '+1234567890' },
        role: {
          type: 'string',
          enum: ['tenant', 'manager', 'owner', 'admin'],
          example: 'tenant'
        },
        ninSlip: {
          type: 'string',
          format: 'binary',
          description: 'NIN Slip Image (JPG, PNG, WebP) or Document (PDF)'
        },
      },
      required: ['fullname', 'email', 'password', 'phoneNumber', 'role'],
    },
  })
  @UseInterceptors(
    FileInterceptor('ninSlip', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'application/pdf',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return callback(
            new Error('Only image files (jpg, jpeg, png, webp) or PDF documents are allowed!'),
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
  async create(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() file?: any,
    @Query('creatorId') creatorId?: string,
  ) {
    return this.usersService.create(createUserDto, file, creatorId);
  }

  @Post('admin-create')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiTags('Admin Portal')
  @ApiOperation({
    summary: 'Admin: Create a new user with auto-password',
    description: 'Access: ADMIN only - Generate temporary password and send via email'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullname: { type: 'string', example: 'John Admin Doe' },
        email: { type: 'string', example: 'tenant@example.com' },
        phoneNumber: { type: 'string', example: '+1234567890' },
        role: {
          type: 'string',
          enum: ['tenant', 'manager', 'owner', 'admin'],
          example: 'tenant'
        },
        ninSlip: {
          type: 'string',
          format: 'binary',
          description: 'NIN Slip Image (JPG, PNG, WebP) or Document (PDF)'
        },
      },
      required: ['fullname', 'email', 'phoneNumber', 'role'],
    },
  })
  @UseInterceptors(
    FileInterceptor('ninSlip', {
      storage: memoryStorage(),
    }),
  )
  async adminCreate(
    @Body() createUserDto: any,
    @UploadedFile() file?: any,
    @Request() req?: any,
  ) {
    return this.usersService.create(
      { ...createUserDto, isAdminCreation: true },
      file,
      req?.user?.id,
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiTags('Tenant Portal', 'Owner Portal', 'Manager Portal', 'Admin Portal')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Get the profile of the currently logged-in user',
  })
  @ApiResponse({ status: 200, description: 'Return current user profile' })
  async getProfile(@Request() req: any) {
    return this.usersService.findOne(req.user.id);
  }

  @Delete('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiTags('Tenant Portal', 'Owner Portal', 'Manager Portal', 'Admin Portal')
  @ApiOperation({
    summary: 'Delete current user account',
    description: 'Delete the account of the currently logged-in user',
  })
  @ApiResponse({ status: 200, description: 'User account deleted successfully' })
  async deleteProfile(@Request() req: any) {
    return this.usersService.remove(req.user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiTags('Admin Portal', 'Owner Portal')
  @ApiOperation({
    summary: 'Get all users with filtering',
    description: 'Access: ADMIN only - List all users with optional filtering'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole, description: 'Filter by user role' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.usersService.findAll(page, limit, { role, isActive });
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiTags('Admin Portal')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'Return user details' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiTags('Admin Portal')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiTags('Admin Portal')
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiTags('Admin Portal')
  @ApiOperation({
    summary: 'Deactivate a user account',
    description: 'Access: ADMIN only - Deactivate user account'
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  async deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiTags('Admin Portal')
  @ApiOperation({
    summary: 'Activate a user account',
    description: 'Access: ADMIN only - Reactivate user account'
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  async activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }

  @Patch(':id/reset-password')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiTags('Admin Portal')
  @ApiOperation({
    summary: 'Reset user password',
    description: 'Access: ADMIN only - Reset user password and force change on next login'
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(@Param('id') id: string) {
    return this.usersService.resetPassword(id);
  }

  @Patch('profile/update')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('profileImage', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(
            new Error('Only image files (jpg, jpeg, png, webp) are allowed!'),
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
        phoneNumber: { type: 'string', example: '+1234567890' },
        profileImage: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiBearerAuth()
  @ApiTags('Tenant Portal', 'Owner Portal', 'Manager Portal', 'Admin Portal')
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Update profile information for the currently logged-in user',
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @Request() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() file?: any,
  ) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto, file);
  }

  @Patch('auth/update-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiTags('Tenant Portal', 'Owner Portal', 'Manager Portal', 'Admin Portal')
  @ApiOperation({
    summary: 'Update password (e.g. for first login)',
    description: 'Update the password and clear the forceUpdatePassword flag'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newPassword: { type: 'string', example: 'NewSecurePassword123!' },
      },
      required: ['newPassword'],
    },
  })
  async updatePassword(
    @Request() req: any,
    @Body('newPassword') newPassword: string,
  ) {
    return this.usersService.updatePassword(req.user.id, newPassword);
  }
}
