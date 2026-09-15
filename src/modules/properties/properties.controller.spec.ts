import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

describe('PropertiesController', () => {
  let controller: PropertiesController;
  let service: jest.Mocked<PropertiesService>;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertiesController],
      providers: [{ provide: PropertiesService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PropertiesController>(PropertiesController);
    service = module.get(PropertiesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should default ownerId and ownerEmail from req.user if user role is owner', async () => {
      const req = { user: { id: 'owner_123', email: 'owner@example.com', role: 'owner' } };
      service.findAll.mockResolvedValueOnce({ items: [], total: 0 });

      await controller.findAll(req);

      expect(service.findAll).toHaveBeenCalledWith(
        'owner_123',
        undefined,
        1,
        10,
        'owner@example.com',
        undefined,
      );
    });

    it('should default managerId and managerEmail from req.user if user role is manager', async () => {
      const req = { user: { id: 'mgr_456', email: 'mgr@example.com', role: 'manager' } };
      service.findAll.mockResolvedValueOnce({ items: [], total: 0 });

      await controller.findAll(req);

      expect(service.findAll).toHaveBeenCalledWith(
        undefined,
        'mgr_456',
        1,
        10,
        undefined,
        'mgr@example.com',
      );
    });

    it('should pass explicit query params when provided', async () => {
      const req = { user: { id: 'admin_1', role: 'admin' } };
      service.findAll.mockResolvedValueOnce({ items: [], total: 0 });

      await controller.findAll(req, 'specific_owner', undefined, undefined, undefined, '2', '20');

      expect(service.findAll).toHaveBeenCalledWith(
        'specific_owner',
        undefined,
        2,
        20,
        undefined,
        undefined,
      );
    });
  });
});
