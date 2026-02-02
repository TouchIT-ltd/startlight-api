import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';

@Injectable()
export class UsersService {
  private readonly collectionName = 'users';

  constructor(
    private mongoDb: MongoDatabaseService,
    private cloudinaryService: CloudinaryService,
  ) {
    this.seedUsers();
  }

  private async seedUsers(): Promise<void> {
    const count = await this.mongoDb.count(this.collectionName);
    if (count === 0) {
      await this.create({
        fullname: 'Admin User',
        email: 'admin@example.com',
        password: 'admin123',
        phoneNumber: '+1234567890',
        role: 'owner',
      });

      await this.create({
        fullname: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        phoneNumber: '+0987654321',
        role: 'tenant',
      });

      await this.create({
        fullname: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
        phoneNumber: '+1122334455',
        role: 'tenant',
      });
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async create(userData: any, file?: any): Promise<any> {
    console.log('Creating user with data:', userData);
    console.log(
      'File received:',
      file
        ? {
            originalname: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
          }
        : 'No file',
    );

    const existingUser = await this.mongoDb.findOneBy(this.collectionName, {
      email: userData.email,
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await this.hashPassword(userData.password);

    // Handle file upload for ninSlip
    let ninSlipUrl = userData.ninSlip;
    if (file) {
      // Validate file type (allow images and PDFs)
      const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/pdf',
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new ConflictException(
          'Only image files (jpg, jpeg, png, webp) or PDF are allowed',
        );
      }

      console.log('Uploading to Cloudinary...');
      // Upload to Cloudinary (pass mimetype)
      ninSlipUrl = await this.cloudinaryService.uploadImage(
        file.buffer,
        file.originalname,
        file.mimetype,
      );
      console.log('Cloudinary result:', ninSlipUrl);
      if (!ninSlipUrl) {
        throw new ConflictException('Failed to upload file');
      }
    }

    const user = await this.mongoDb.create(this.collectionName, {
      fullname: userData.fullname,
      email: userData.email,
      password: hashedPassword,
      phoneNumber: userData.phoneNumber,
      nameSlipImage: ninSlipUrl,
      role: userData.role,
      isActive: true,
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll(page = 1, limit = 10): Promise<any> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.mongoDb.findAll(this.collectionName, {}, { skip, limit }),
      this.mongoDb.count(this.collectionName),
    ]);

    const usersWithoutPasswords = users.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      data: usersWithoutPasswords,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<any> {
    const user = await this.mongoDb.findOne(this.collectionName, id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByEmail(email: string): Promise<any> {
    return this.mongoDb.findOneBy(this.collectionName, { email });
  }

  async update(id: string, updateData: any): Promise<any> {
    if (updateData.password) {
      updateData.password = await this.hashPassword(updateData.password);
    }

    const updatedUser = await this.mongoDb.update(this.collectionName, id, {
      ...updateData,
      updatedAt: new Date(),
    });

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async remove(id: string): Promise<{ message: string }> {
    const deleted = await this.mongoDb.delete(this.collectionName, id);

    if (!deleted) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return { message: 'User deleted successfully' };
  }
}
