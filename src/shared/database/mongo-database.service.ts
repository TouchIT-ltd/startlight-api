import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Document, Schema } from 'mongoose';

export interface DatabaseEntity extends Document {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

@Injectable()
export class MongoDatabaseService implements OnModuleInit {
  private readonly logger = new Logger(MongoDatabaseService.name);
  private models: Map<string, Model<any>> = new Map();

  constructor(
    @InjectConnection() private connection: Connection,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log('MongoDB Database Service initialized');
    await this.createIndexes();
  }

  /**
   * Create database indexes for optimal query performance
   */
  private async createIndexes() {
    try {
      this.logger.log('Creating database indexes...');

      if (!this.connection.db) {
        this.logger.warn('Database connection not available, skipping index creation');
        return;
      }

      // Lease indexes for efficient expiration queries
      const leaseCollection = this.connection.db.collection('leases');

      // Compound index for lease expiration queries: status + endDate
      // This will make the cron job query very fast even with 1000+ leases
      await leaseCollection.createIndex(
        { status: 1, endDate: 1 },
        {
          name: 'leases_status_endDate',
          background: true, // Create in background to avoid blocking
        }
      );

      // Additional useful indexes for lease queries
      await leaseCollection.createIndex(
        { userId: 1, status: 1 },
        { name: 'leases_userId_status', background: true }
      );

      await leaseCollection.createIndex(
        { propertyId: 1, unitNumber: 1 },
        { name: 'leases_property_unit', background: true }
      );

      // Rent requests indexes
      const rentRequestCollection = this.connection.db.collection('rent-requests');
      await rentRequestCollection.createIndex(
        { unitId: 1, status: 1 },
        { name: 'rent_requests_unitId_status', background: true }
      );

      await rentRequestCollection.createIndex(
        { userId: 1, status: 1 },
        { name: 'rent_requests_userId_status', background: true }
      );

      // Units indexes
      const unitsCollection = this.connection.db.collection('units');
      await unitsCollection.createIndex(
        { propertyId: 1, unitNumber: 1 },
        { name: 'units_property_unitNumber', background: true }
      );

      await unitsCollection.createIndex(
        { status: 1 },
        { name: 'units_status', background: true }
      );

      this.logger.log('Database indexes created successfully');
    } catch (error) {
      this.logger.error('Error creating database indexes:', error);
      // Don't throw error to prevent app startup failure
    }
  }

  // Get or create model for collection
  private getModel(collectionName: string): Model<any> {
    if (!this.models.has(collectionName)) {
      // Create a dynamic schema
      const schema = new Schema(
        {
          id: { type: String, required: true, unique: true },
          createdAt: { type: Date, default: Date.now },
          updatedAt: { type: Date, default: Date.now },
        },
        {
          collection: collectionName,
          timestamps: true,
          strict: false, // Allow additional fields
        },
      );

      const model = this.connection.model(
        collectionName,
        schema,
        collectionName,
      );
      this.models.set(collectionName, model);
    }

    return this.models.get(collectionName)!;
  }

  // Create
  async create(collectionName: string, data: any): Promise<any> {
    try {
      const Model = this.getModel(collectionName);
      const entity = new Model({
        ...data,
        id: data.id || this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedEntity = await entity.save();
      this.logger.debug(`Created in ${collectionName}: ${savedEntity.id}`);

      return savedEntity.toObject();
    } catch (error) {
      this.logger.error(`Error creating in ${collectionName}:`, error);
      throw error;
    }
  }

  // Find all with pagination
  async findAll(
    collectionName: string,
    filter: any = {},
    options: { skip?: number; limit?: number; sort?: any } = {},
  ): Promise<any[]> {
    try {
      const Model = this.getModel(collectionName);
      let query = Model.find(filter);

      if (options.sort) {
        query = query.sort(options.sort);
      }

      if (options.skip) {
        query = query.skip(options.skip);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const results = await query.exec();
      return results.map((doc) => doc.toObject());
    } catch (error) {
      this.logger.error(`Error finding all in ${collectionName}:`, error);
      throw error;
    }
  }

  // Find one by ID
  async findOne(collectionName: string, id: string): Promise<any | null> {
    try {
      const Model = this.getModel(collectionName);
      const entity = await Model.findOne({ id }).exec();
      return entity ? entity.toObject() : null;
    } catch (error) {
      this.logger.error(`Error finding one in ${collectionName}:`, error);
      throw error;
    }
  }

  // Find by field
  async findOneBy(collectionName: string, query: any): Promise<any | null> {
    try {
      const Model = this.getModel(collectionName);
      const entity = await Model.findOne(query).exec();
      return entity ? entity.toObject() : null;
    } catch (error) {
      this.logger.error(`Error finding by query in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Atomic conditional update; returns the document after update (default) or null if no match.
   * Use for idempotent "claim" patterns (e.g. only one worker may transition PENDING → SUCCESS).
   */
  async findOneAndUpdate(
    collectionName: string,
    filter: any,
    data: any,
    options: { new?: boolean } = {},
  ): Promise<any | null> {
    try {
      const Model = this.getModel(collectionName);
      const updatedEntity = await Model.findOneAndUpdate(
        filter,
        { ...data, updatedAt: new Date() },
        { new: options.new ?? true },
      ).exec();

      if (updatedEntity) {
        this.logger.debug(`findOneAndUpdate matched in ${collectionName}`);
        return updatedEntity.toObject();
      }
      return null;
    } catch (error) {
      this.logger.error(`Error findOneAndUpdate in ${collectionName}:`, error);
      throw error;
    }
  }

  // Update
  async update(
    collectionName: string,
    id: string,
    data: any,
  ): Promise<any | null> {
    try {
      const Model = this.getModel(collectionName);
      const updatedEntity = await Model.findOneAndUpdate(
        { id },
        { ...data, updatedAt: new Date() },
        { new: true },
      ).exec();

      if (updatedEntity) {
        this.logger.debug(`Updated in ${collectionName}: ${id}`);
        return updatedEntity.toObject();
      }

      return null;
    } catch (error) {
      this.logger.error(`Error updating in ${collectionName}:`, error);
      throw error;
    }
  }

  // Delete
  async delete(collectionName: string, id: string): Promise<boolean> {
    try {
      const Model = this.getModel(collectionName);
      const result = await Model.deleteOne({ id }).exec();
      return result.deletedCount > 0;
    } catch (error) {
      this.logger.error(`Error deleting from ${collectionName}:`, error);
      throw error;
    }
  }

  // Count documents
  async count(collectionName: string, filter: any = {}): Promise<number> {
    try {
      const Model = this.getModel(collectionName);
      return await Model.countDocuments(filter).exec();
    } catch (error) {
      this.logger.error(`Error counting in ${collectionName}:`, error);
      throw error;
    }
  }

  // Update many documents matching a filter
  async updateMany(collectionName: string, filter: any, update: any): Promise<any> {
    try {
      const Model = this.getModel(collectionName);
      const res = await Model.updateMany(filter, { ...update, updatedAt: new Date() }).exec();
      return res;
    } catch (error) {
      this.logger.error(`Error updating many in ${collectionName}:`, error);
      throw error;
    }
  }

  // Generate unique ID (fallback if not provided)
  private generateId(): string {
    return `mongo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
