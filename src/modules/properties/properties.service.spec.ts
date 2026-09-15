import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesService } from './properties.service';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let mongoDb: jest.Mocked<MongoDatabaseService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockMongoDb = {
      findAll: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockUsersService = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(null)),
      findByEmail: jest.fn().mockImplementation(() => Promise.resolve(null)),
    };

    const mockAuditLogsService = {
      create: jest.fn(),
    };

    const mockCloudinaryService = {
      uploadImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        { provide: MongoDatabaseService, useValue: mockMongoDb },
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
    mongoDb = module.get(MongoDatabaseService);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should build $or query matching ownerId and ownerEmail when ownerId is given', async () => {
      usersService.findOne.mockImplementation((id: string) => {
        if (id === 'user_1') return Promise.resolve({ id: 'user_1', email: 'owner@test.com' } as any);
        return Promise.resolve(null);
      });
      mongoDb.findAll.mockResolvedValueOnce([{ id: 'prop_1', ownerId: 'user_1' }]);
      mongoDb.count.mockResolvedValueOnce(1);

      const result = await service.findAll('user_1');

      expect(mongoDb.findAll).toHaveBeenCalledWith(
        'properties',
        { $or: [{ ownerId: 'user_1' }, { ownerEmail: 'owner@test.com' }] },
        { skip: 0, limit: 10, sort: { createdAt: -1 } },
      );
      expect(result).toEqual({
        data: [{ id: 'prop_1', ownerId: 'user_1', ownerEmail: 'owner@test.com' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should build $or query matching ownerId and ownerEmail when ownerEmail is given', async () => {
      usersService.findByEmail.mockImplementation((email: string) => {
        if (email === 'owner@test.com') return Promise.resolve({ id: 'user_1', email: 'owner@test.com' } as any);
        return Promise.resolve(null);
      });
      mongoDb.findAll.mockResolvedValueOnce([{ id: 'prop_1', ownerEmail: 'owner@test.com' }]);
      mongoDb.count.mockResolvedValueOnce(1);

      const result = await service.findAll(undefined, undefined, 1, 10, 'owner@test.com');

      expect(mongoDb.findAll).toHaveBeenCalledWith(
        'properties',
        { $or: [{ ownerId: 'user_1' }, { ownerEmail: 'owner@test.com' }] },
        { skip: 0, limit: 10, sort: { createdAt: -1 } },
      );
      expect(result.total).toBe(1);
    });

    it('should combine owner and manager queries using $and when both are passed', async () => {
      usersService.findOne.mockImplementation((id: string) => {
        if (id === 'owner_1') return Promise.resolve({ id: 'owner_1', email: 'owner@test.com' } as any);
        if (id === 'mgr_1') return Promise.resolve({ id: 'mgr_1', email: 'mgr@test.com' } as any);
        return Promise.resolve(null);
      });

      mongoDb.findAll.mockResolvedValueOnce([]);
      mongoDb.count.mockResolvedValueOnce(0);

      await service.findAll('owner_1', 'mgr_1');

      expect(mongoDb.findAll).toHaveBeenCalledWith(
        'properties',
        {
          $and: [
            { $or: [{ ownerId: 'owner_1' }, { ownerEmail: 'owner@test.com' }] },
            { $or: [{ managerId: 'mgr_1' }, { managerEmail: 'mgr@test.com' }] },
          ],
        },
        { skip: 0, limit: 10, sort: { createdAt: -1 } },
      );
    });
  });
});
