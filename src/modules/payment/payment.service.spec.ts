jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { PaymentService } from './payment.service';

describe('PaymentService — renewal / idempotent provisioning', () => {
  let service: PaymentService;
  let mongoDb: {
    findOneAndUpdate: jest.Mock;
    findOne: jest.Mock;
    findAll: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  let leasesService: { create: jest.Mock };
  let unitsService: { update: jest.Mock };
  let auditLogsService: { create: jest.Mock };
  let notificationsService: { create: jest.Mock };
  let configService: { getOrThrow: jest.Mock };

  const basePayment = () => ({
    id: 'pay_1',
    userId: 'tenant_1',
    amount: 50000,
    reference: 'STARLIGHT-REF',
    resourceType: 'RENT_REQUEST',
    resourceId: 'rr_1',
    status: 'SUCCESS',
  });

  beforeEach(() => {
    mongoDb = {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    };
    leasesService = { create: jest.fn().mockResolvedValue({ id: 'lease_new' }) };
    unitsService = { update: jest.fn().mockResolvedValue({}) };
    auditLogsService = { create: jest.fn().mockResolvedValue({}) };
    notificationsService = { create: jest.fn().mockResolvedValue({}) };
    configService = { getOrThrow: jest.fn() };

    service = new PaymentService(
      configService as any,
      mongoDb as any,
      auditLogsService as any,
      notificationsService as any,
      leasesService as any,
      unitsService as any,
    );
  });

  it('does not call leasesService.create when rent request was already paid (duplicate callback)', async () => {
    mongoDb.findOneAndUpdate.mockResolvedValue(null);
    mongoDb.findOne.mockResolvedValue({ id: 'rr_1', status: 'paid' });

    await (service as any)._processSuccessfulPayment(basePayment());

    expect(leasesService.create).not.toHaveBeenCalled();
    expect(mongoDb.update).not.toHaveBeenCalled();
  });

  it('renews an existing lease via update, never leasesService.create', async () => {
    mongoDb.findOneAndUpdate.mockResolvedValueOnce({
      id: 'rr_1',
      userId: 'tenant_1',
      unitId: 'unit_1',
      leaseId: 'lease_1',
      requestType: 'renewal',
      newEndDate: '2028-06-01',
      amount: 120000,
      status: 'approved',
    });
    mongoDb.findOne
      .mockResolvedValueOnce({
        id: 'unit_1',
        propertyId: 'prop_1',
        unitNumber: '12A',
        price: 120000,
      })
      .mockResolvedValueOnce({
        id: 'lease_1',
        propertyId: 'prop_1',
        unitNumber: '12A',
        userId: 'tenant_1',
      });

    await (service as any)._processSuccessfulPayment(basePayment());

    expect(leasesService.create).not.toHaveBeenCalled();
    expect(mongoDb.update).toHaveBeenCalledWith(
      'leases',
      'lease_1',
      expect.objectContaining({
        status: 'active',
        endDate: '2028-06-01',
      }),
    );
  });

  it('updates an existing lease for a new rental payment instead of creating a duplicate', async () => {
    mongoDb.findOneAndUpdate.mockResolvedValueOnce({
      id: 'rr_1',
      userId: 'tenant_1',
      unitId: 'unit_1',
      requestType: 'new_rental',
      amount: 90000,
      status: 'approved',
    });
    mongoDb.findOne.mockResolvedValueOnce({
      id: 'unit_1',
      propertyId: 'prop_1',
      unitNumber: '5B',
      price: 90000,
    });
    mongoDb.findAll.mockResolvedValueOnce([
      { id: 'lease_existing', propertyId: 'prop_1', unitNumber: '5B', userId: 'tenant_1' },
    ]);

    await (service as any)._processSuccessfulPayment(basePayment());

    expect(leasesService.create).not.toHaveBeenCalled();
    expect(mongoDb.update).toHaveBeenCalledWith(
      'leases',
      'lease_existing',
      expect.objectContaining({ status: 'active' }),
    );
    expect(unitsService.update).toHaveBeenCalled();
    expect(mongoDb.updateMany).toHaveBeenCalled();
  });

  it('uses sorted fallback lease when renewal markers are set but leaseId is missing', async () => {
    mongoDb.findOneAndUpdate.mockResolvedValueOnce({
      id: 'rr_1',
      userId: 'tenant_1',
      unitId: 'unit_1',
      requestType: 'renewal',
      newEndDate: '2029-01-15',
      amount: 80000,
      status: 'approved',
    });
    mongoDb.findOne.mockResolvedValueOnce({
      id: 'unit_1',
      propertyId: 'prop_1',
      unitNumber: '9',
      price: 80000,
    });
    mongoDb.findAll.mockResolvedValueOnce([{ id: 'lease_fallback' }]);

    await (service as any)._processSuccessfulPayment(basePayment());

    expect(mongoDb.update).toHaveBeenCalledWith(
      'leases',
      'lease_fallback',
      expect.objectContaining({ endDate: '2029-01-15' }),
    );
    expect(leasesService.create).not.toHaveBeenCalled();
  });
});
