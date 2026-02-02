import { Injectable, Logger } from '@nestjs/common';

export interface MockEntity {
  id: string;
  _id: string;
  [key: string]: any;
}

@Injectable()
export class MockDatabaseService {
  private readonly logger = new Logger(MockDatabaseService.name);
  private collections: Map<string, MockEntity[]> = new Map();
  private idCounter = 1;

  // Create collection if it doesn't exist
  private ensureCollection(collectionName: string): MockEntity[] {
    if (!this.collections.has(collectionName)) {
      this.collections.set(collectionName, []);
    }
    return this.collections.get(collectionName)!;
  }

  // Generate unique ID
  private generateId(): string {
    return `mock_${this.idCounter++}`;
  }

  // Create
  async create(collectionName: string, data: any): Promise<any> {
    const collection = this.ensureCollection(collectionName);
    const id = this.generateId();

    const entity = {
      ...data,
      id,
      _id: id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    collection.push(entity);
    this.logger.debug(`Created in ${collectionName}: ${id}`);

    return entity;
  }

  // Find all with pagination
  async findAll(
    collectionName: string,
    filter: any = {},
    options: { skip?: number; limit?: number; sort?: any } = {},
  ): Promise<any[]> {
    const collection = this.ensureCollection(collectionName);
    let results = [...collection];

    // Apply filtering
    if (Object.keys(filter).length > 0) {
      results = results.filter((item) => {
        return Object.entries(filter).every(([key, value]) => {
          return item[key] === value;
        });
      });
    }

    // Sorting
    if (options.sort) {
      Object.entries(options.sort).forEach(([field, direction]) => {
        results.sort((a, b) => {
          if (a[field] < b[field]) return -1 * (direction as number);
          if (a[field] > b[field]) return 1 * (direction as number);
          return 0;
        });
      });
    }

    // Pagination
    const skip = options.skip || 0;
    const limit = options.limit || results.length;
    results = results.slice(skip, skip + limit);

    return results;
  }

  // Find one by ID
  async findOne(collectionName: string, id: string): Promise<any | null> {
    const collection = this.ensureCollection(collectionName);
    return collection.find((item) => item.id === id || item._id === id) || null;
  }

  // Find by field
  async findOneBy(collectionName: string, query: any): Promise<any | null> {
    const collection = this.ensureCollection(collectionName);
    return (
      collection.find((item) =>
        Object.entries(query).every(([key, value]) => item[key] === value),
      ) || null
    );
  }

  // Update
  async update(
    collectionName: string,
    id: string,
    data: any,
  ): Promise<any | null> {
    const collection = this.ensureCollection(collectionName);
    const index = collection.findIndex(
      (item) => item.id === id || item._id === id,
    );

    if (index === -1) return null;

    const updatedEntity = {
      ...collection[index],
      ...data,
      updatedAt: new Date(),
    };

    collection[index] = updatedEntity;
    this.logger.debug(`Updated in ${collectionName}: ${id}`);

    return updatedEntity;
  }

  // Delete
  async delete(collectionName: string, id: string): Promise<boolean> {
    const collection = this.ensureCollection(collectionName);
    const initialLength = collection.length;

    const filtered = collection.filter(
      (item) => item.id !== id && item._id !== id,
    );
    this.collections.set(collectionName, filtered);

    return initialLength > filtered.length;
  }

  // Count documents
  async count(collectionName: string, filter: any = {}): Promise<number> {
    const collection = this.ensureCollection(collectionName);
    let results = collection;

    if (Object.keys(filter).length > 0) {
      results = results.filter((item) =>
        Object.entries(filter).every(([key, value]) => item[key] === value),
      );
    }

    return results.length;
  }
}
