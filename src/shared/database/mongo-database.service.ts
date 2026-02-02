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

  // Generate unique ID (fallback if not provided)
  private generateId(): string {
    return `mongo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
