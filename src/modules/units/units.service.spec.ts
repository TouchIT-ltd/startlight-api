import { Test, TestingModule } from '@nestjs/testing';
import { UnitsService } from './units.service';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';
import { UsersService } from '../users/users.service';
import { ConflictException } from '@nestjs/common';

describe('UnitsService', () => {
  let service: UnitsService;
  let mongoDb: jest.Mocked<MongoDatabaseService>;
  let mockCloudinaryService: { uploadImage: jest.Mock };

  beforeEach(async () => {
    const mockMongoDb = {
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockAuditLogsService = {
      create: jest.fn(),
    };

    mockCloudinaryService = {
      uploadImage: jest.fn(),
    };

    const mockUsersService = {
      findOne: jest.fn(),
      findByEmail: jest.fn(),
    };

    const testModule: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: MongoDatabaseService, useValue: mockMongoDb },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = testModule.get<UnitsService>(UnitsService);
    mongoDb = testModule.get(MongoDatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if unit number already exists in property', async () => {
      mongoDb.findOneBy.mockResolvedValueOnce({ id: 'existing_u1' });

      await expect(
        service.create({ propertyId: 'prop_1', unitNumber: '101', price: 1000 }, [{ originalname: 'a.jpg', buffer: Buffer.from(''), mimetype: 'image/jpeg' } as any]),
      ).rejects.toThrow(ConflictException);
    });

    it('should set status occupied and create active lease when tenantId is provided', async () => {
      mongoDb.findOneBy.mockResolvedValueOnce(null); // no conflict
      mongoDb.create
        .mockResolvedValueOnce({ id: 'u_new', propertyId: 'prop_1', unitNumber: '101', status: 'occupied', tenantId: 'tenant_1' }) // create unit
        .mockResolvedValueOnce({ id: 'lease_new' }); // create lease
      mongoDb.findOne.mockResolvedValueOnce({ id: 'prop_1', ownerId: 'owner_1' }); // property lookup for audit

      const mockFiles = [{ originalname: 'a.jpg', buffer: Buffer.from(''), mimetype: 'image/jpeg' }] as any;
      mockCloudinaryService.uploadImage.mockResolvedValue('https://res.cloudinary.com/test.jpg');

      const result = await service.create({
        propertyId: 'prop_1',
        unitNumber: '101',
        tenantId: 'tenant_1',
        price: 1500,
        duration: '12',
      }, mockFiles);

      expect(mongoDb.create).toHaveBeenNthCalledWith(
        1,
        'units',
        expect.objectContaining({
          propertyId: 'prop_1',
          unitNumber: '101',
          tenantId: 'tenant_1',
          status: 'occupied',
        }),
      );

      expect(mongoDb.create).toHaveBeenNthCalledWith(
        2,
        'leases',
        expect.objectContaining({
          tenantId: 'tenant_1',
          userId: 'tenant_1',
          propertyId: 'prop_1',
          unitNumber: '101',
          rentAmount: 1500,
          status: 'active',
        }),
      );

      expect(result.id).toBe('u_new');
    });
  });

  describe('update', () => {
    it('should update unit and create active lease if tenantId is added and no lease exists', async () => {
      const existingUnit = {
        id: 'u_101',
        propertyId: 'prop_1',
        unitNumber: '101',
        price: 1200,
        duration: '12',
      };

      mongoDb.findOne.mockResolvedValueOnce(existingUnit); // get existing unit
      mongoDb.update.mockResolvedValueOnce({ ...existingUnit, tenantId: 'tenant_99', status: 'occupied' }); // update unit
      mongoDb.findOneBy.mockResolvedValueOnce(null); // no existing lease
      mongoDb.create.mockResolvedValueOnce({ id: 'lease_auto' }); // create lease
      mongoDb.findOne.mockResolvedValueOnce({ id: 'prop_1', ownerId: 'owner_1' }); // property for audit

      const result = await service.update('u_101', { tenantId: 'tenant_99' });

      expect(mongoDb.create).toHaveBeenCalledWith(
        'leases',
        expect.objectContaining({
          tenantId: 'tenant_99',
          userId: 'tenant_99',
          propertyId: 'prop_1',
          unitNumber: '101',
          rentAmount: 1200,
          status: 'active',
        }),
      );
      expect(result.status).toBe('occupied');
    });

    it('should update existing lease status to active when updating unit with tenantId', async () => {
      const existingUnit = {
        id: 'u_101',
        propertyId: 'prop_1',
        unitNumber: '101',
        price: 1200,
      };

      const existingLease = {
        id: 'lease_old',
        tenantId: 'tenant_99',
        status: 'expired',
        rentAmount: 1000,
      };

      mongoDb.findOne.mockResolvedValueOnce(existingUnit); // get existing unit
      mongoDb.update
        .mockResolvedValueOnce({ ...existingUnit, tenantId: 'tenant_99', status: 'occupied' }) // update unit
        .mockResolvedValueOnce({ ...existingLease, status: 'active', rentAmount: 1200 }); // update lease
      mongoDb.findOneBy.mockResolvedValueOnce(existingLease); // existing lease found
      mongoDb.findOne.mockResolvedValueOnce({ id: 'prop_1', ownerId: 'owner_1' }); // audit lookup

      await service.update('u_101', { tenantId: 'tenant_99', price: 1200 });

      expect(mongoDb.update).toHaveBeenNthCalledWith(
        2,
        'leases',
        'lease_old',
        expect.objectContaining({
          status: 'active',
          rentAmount: 1200,
        }),
      );
    });
  });
});
