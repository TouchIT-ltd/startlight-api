"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./src/app.module");
const leases_service_1 = require("./src/modules/leases/leases.service");
const rent_requests_service_1 = require("./src/modules/rent-requests/rent-requests.service");
const mongo_database_service_1 = require("./src/shared/database/mongo-database.service");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const leasesService = app.get(leases_service_1.LeasesService);
    const rentRequestsService = app.get(rent_requests_service_1.RentRequestsService);
    const mongoDb = app.get(mongo_database_service_1.MongoDatabaseService);
    const testUserId = 'test_user_id_block_test_' + Date.now();
    const testPropertyId = 'test_property_id_123';
    const testUnitId = 'test_unit_id_123';
    console.log('Testing lease blocking for user:', testUserId);
    try {
        console.log('\n--- Step 1: Create an active lease ---');
        await mongoDb.create('leases', {
            userId: testUserId,
            propertyId: testPropertyId,
            unitNumber: 'A1',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            rentAmount: 1000,
            status: 'active'
        });
        console.log('Successfully seeded an active lease in DB.');
        console.log('\n--- Step 2: Attempt to create another lease directly via LeasesService ---');
        await leasesService.create({
            userId: testUserId,
            propertyId: testPropertyId,
            unitNumber: 'A2',
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            rentAmount: 1000,
            status: 'active'
        });
        console.log('FAILED: Service allowed creating a second lease!');
    }
    catch (error) {
        console.log('SUCCESS: Service blocked creating a second lease. Error:', error.message);
    }
    try {
        console.log('\n--- Step 3: Attempt to create a rent request via RentRequestsService ---');
        const unit = await mongoDb.create('units', {
            propertyId: testPropertyId,
            unitNumber: 'A3',
            price: 1000,
            status: 'vacant'
        });
        await rentRequestsService.create({
            tenantId: testUserId,
            unitId: unit.id,
            propertyId: testPropertyId,
            reason: 'Testing second rent request'
        });
        console.log('FAILED: Service allowed creating a rent request with active lease!');
    }
    catch (error) {
        console.log('SUCCESS: Service blocked creating a rent request. Error:', error.message);
    }
    console.log('\n--- Cleanup ---');
    const leases = await mongoDb.findAll('leases', { userId: testUserId });
    for (const lease of leases) {
        await mongoDb.delete('leases', lease.id);
    }
    const units = await mongoDb.findAll('units', { propertyId: testPropertyId });
    for (const unit of units) {
        await mongoDb.delete('units', unit.id);
    }
    await app.close();
}
bootstrap().catch(err => {
    console.error('Test script failed:', err);
    process.exit(1);
});
