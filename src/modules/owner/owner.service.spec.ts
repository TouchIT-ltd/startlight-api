import { Test, TestingModule } from '@nestjs/testing';
import { OwnerService } from './owner.service';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';

describe('OwnerService', () => {
  let service: OwnerService;
  let mongoDb: jest.Mocked<MongoDatabaseService>;

  beforeEach(async () => {
    const mockMongoDb = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnerService,
        { provide: MongoDatabaseService, useValue: mockMongoDb },
      ],
    }).compile();

    service = module.get<OwnerService>(OwnerService);
    mongoDb = module.get(MongoDatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should query properties using ownerId and ownerEmail if owner user exists', async () => {
      const ownerId = 'user_123';
      mongoDb.findOne.mockResolvedValueOnce({ id: 'user_123', email: 'owner@example.com' });
      mongoDb.findAll
        .mockResolvedValueOnce([
          { id: 'prop_1', name: 'Sunrise Apartments', ownerId: 'user_123' },
          { id: 'prop_2', name: 'Sunset Villas', ownerEmail: 'owner@example.com' },
        ]) // properties query
        .mockResolvedValueOnce([
          { id: 'u1', propertyId: 'prop_1', status: 'occupied' },
          { id: 'u2', propertyId: 'prop_1', status: 'vacant' },
          { id: 'u3', propertyId: 'prop_2', status: 'occupied' },
        ]); // units query

      const result = await service.getDashboard(ownerId);

      expect(mongoDb.findOne).toHaveBeenCalledWith('users', ownerId);
      expect(mongoDb.findAll).toHaveBeenNthCalledWith(1, 'properties', {
        $or: [{ ownerId: 'user_123' }, { ownerEmail: 'owner@example.com' }],
      });
      expect(result.totalProperties).toBe(2);
      expect(result.totalUnits).toBe(3);
      expect(result.occupiedUnits).toBe(2);
      expect(result.vacantUnits).toBe(1);
      expect(result.occupancyRate).toBe(66.7);
    });

    it('should query properties using email directly if ownerId is an email', async () => {
      const ownerId = 'owner@example.com';
      mongoDb.findOne.mockRejectedValueOnce(new Error('Not found'));
      mongoDb.findOneBy.mockResolvedValueOnce({ id: 'user_999', email: 'owner@example.com' });
      mongoDb.findAll
        .mockResolvedValueOnce([
          { id: 'prop_1', name: 'Starlight Tower', ownerEmail: 'owner@example.com' },
        ])
        .mockResolvedValueOnce([
          { id: 'u1', propertyId: 'prop_1', status: 'occupied' },
        ]);

      const result = await service.getDashboard(ownerId);

      expect(mongoDb.findAll).toHaveBeenNthCalledWith(1, 'properties', {
        $or: [{ ownerId: 'user_999' }, { ownerEmail: 'owner@example.com' }],
      });
      expect(result.totalProperties).toBe(1);
      expect(result.occupancyRate).toBe(100);
    });
  });
});
