import { Injectable } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';

@Injectable()
export class ManagerService {
  constructor(
    private readonly mongoDb: MongoDatabaseService,
  ) {}

  async getDashboard(managerId: string): Promise<any> {
    // Get all properties managed by this manager
    const properties = await this.mongoDb.findAll('properties', { managerId });

    // Get all units in these properties
    const propertyIds = properties.map(p => p.id);
    const units = await this.mongoDb.findAll('units', { propertyId: { $in: propertyIds } });

    // Calculate occupancy
    const occupiedUnits = units.filter(unit => unit.status === 'occupied').length;
    const totalUnits = units.length;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    // Get pending rent requests (this would need a rent-requests collection)
    // For now, return 0 as placeholder
    const pendingRequests = 0;

    // Calculate rent collected this month (placeholder logic)
    // This would need actual lease/payment data
    const rentCollected = 0;

    // Calculate rent arrears (placeholder)
    const rentArrears = 0;

    // Monthly stats (placeholder)
    const monthlyStats = {
      january: 0,
      february: 0,
      march: 0,
      april: 0,
      may: 0,
      june: 0,
      july: 0,
      august: 0,
      september: 0,
      october: 0,
      november: 0,
      december: 0,
    };
    // Fetch owners for these properties
    const ownerIds = Array.from(new Set(properties.map((p: any) => p.ownerId).filter(Boolean)));
    let ownersList: Array<{ id: string; fullname: string }> = [];
    if (ownerIds.length > 0) {
      const owners = await this.mongoDb.findAll('users', { id: { $in: ownerIds } });
      ownersList = owners.map((o: any) => ({ id: o.id, fullname: o.fullname }));
    }

    return {
      totalProperties: properties.length,
      totalUnits,
      occupiedUnits,
      vacantUnits: totalUnits - occupiedUnits,
      occupancyRate: Math.round(occupancyRate * 10) / 10, // Round to 1 decimal
      pendingRequests,
      rentCollected,
      rentArrears,
      monthlyStats,
      owners: ownersList,
    };
  }

  async getOwners(managerId: string): Promise<Array<{ id: string; fullname: string }>> {
    const properties = await this.mongoDb.findAll('properties', { managerId });
    const ownerIds = Array.from(new Set(properties.map((p: any) => p.ownerId).filter(Boolean)));
    if (ownerIds.length === 0) return [];

    const owners = await this.mongoDb.findAll('users', { id: { $in: ownerIds } });
    return owners.map((o: any) => ({ id: o.id, fullname: o.fullname }));
  }
}