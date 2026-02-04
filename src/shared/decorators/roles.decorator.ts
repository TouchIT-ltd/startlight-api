import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  ADMIN = 'admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  TENANT = 'tenant',
}

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);