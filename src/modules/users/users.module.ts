import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SharedModule } from '../../shared/shared.module'; // Add this import

@Module({
  imports: [SharedModule], // Import SharedModule to get MockDatabaseService
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
