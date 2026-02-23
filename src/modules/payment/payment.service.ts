import {
    Injectable,
    Logger,
    BadRequestException,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { randomBytes, createHmac } from 'crypto';
import fetch from 'node-fetch';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly collectionName = 'payments';

    constructor(
        private readonly configService: ConfigService,
        private readonly mongoDb: MongoDatabaseService,
        private readonly auditLogsService: AuditLogsService,
        private readonly notificationsService: NotificationsService,
    ) { }

    public generatePaymentReference(prefix = 'STARLIGHT'): string {
        const now = new Date();
        const datePart = now
            .toISOString()
            .replace(/[-:TZ]/g, '') // 20251008T231045Z → 20251008T231045
            .slice(0, 14); // Keep up to seconds
        const randomPart = randomBytes(3).toString('hex').toUpperCase(); // 6-char hex
        return `${prefix}-${datePart}-${randomPart}`;
    }

    async initializePayment(
        userId: string,
        resourceId: string,
        resourceType: string,
        metadata: any = {},
    ) {
        try {
            // 1. Fetch User to get Email
            const user = await this.mongoDb.findOne('users', userId);
            if (!user) throw new BadRequestException('User not found');
            const email = user.email;

            // 2. Fetch Resource to get Amount
            let amount = 0;
            let resourceTitle = 'Payment';

            switch (resourceType) {
                case 'LEASE': // Paying for a lease (e.g. initial rent)
                    const lease = await this.mongoDb.findOne('leases', resourceId);
                    if (!lease) throw new NotFoundException('Lease not found');
                    // Check ownership if needed: if (lease.userId !== userId) ...
                    amount = lease.rentAmount;
                    resourceTitle = `Lease Payment: ${lease.unitNumber || resourceId}`;
                    break;

                case 'RENT_REQUEST': // Paying a specific rent request
                    const rentRequest = await this.mongoDb.findOne('rent-requests', resourceId);
                    if (!rentRequest) throw new NotFoundException('Rent Request not found');

                    // Security Check 1: Ownership
                    if (rentRequest.userId !== userId) {
                        throw new UnauthorizedException('You can only pay for your own rent requests');
                    }

                    // Security Check 2: Approval Status
                    if (rentRequest.status !== 'approved') {
                        throw new BadRequestException(`Cannot pay for a request with status: ${rentRequest.status}. Wait for approval.`);
                    }

                    // Security Check 3: Double Payment
                    if (rentRequest.isPaid) {
                        throw new BadRequestException('This rent request has already been paid.');
                    }
                    // Check for existing successful payments for this resource
                    const existingPayment = await this.mongoDb.findOneBy(this.collectionName, {
                        resourceId,
                        resourceType: 'RENT_REQUEST',
                        status: 'SUCCESS'
                    });
                    if (existingPayment) {
                        throw new BadRequestException('Payment already completed for this request.');
                    }

                    amount = rentRequest.requestedAmount || rentRequest.amount; // Handle both naming conventions if any
                    resourceTitle = `Rent Request: ${rentRequest.requestType || 'Unit Rental'}`;
                    break;

                case 'UNIT': // Paying for a unit (maybe deposit?)
                    // Primary: resourceId is expected to be the unit ID
                    let unit = await this.mongoDb.findOne('units', resourceId);

                    // Fallbacks: frontend may send propertyId as resourceId and include unitNumber in metadata.
                    // Try to locate unit by (propertyId, unitNumber) when unit lookup fails.
                    if (!unit && metadata && metadata.unitNumber) {
                        unit = await this.mongoDb.findOneBy('units', { propertyId: resourceId, unitNumber: metadata.unitNumber });
                    }

                    // Another fallback: unit may have already been converted to a lease (post-payment). Try finding an active lease for that property/unit.
                    if (!unit && metadata && metadata.unitNumber) {
                        const lease = await this.mongoDb.findOneBy('leases', { propertyId: resourceId, unitNumber: metadata.unitNumber, status: 'active' });
                        if (lease) {
                            // treat as lease payment
                            amount = lease.rentAmount;
                            resourceTitle = `Lease Payment: ${lease.unitNumber || resourceId}`;
                            // make sure we save payment referencing the lease
                            resourceId = lease.id ?? lease._id?.toString?.();
                            resourceType = 'LEASE';
                            break;
                        }
                    }

                    if (!unit) throw new NotFoundException('Unit not found');
                    amount = unit.price;
                    resourceTitle = `Unit Payment: ${unit.unitNumber}`;
                    break;

                case 'PLAN': // Paying for a subscription plan
                    // Assuming 'plans' collection exists or logic
                    const plan = await this.mongoDb.findOne('plans', resourceId);
                    if (!plan) throw new NotFoundException('Plan not found');
                    amount = plan.price || plan.amount; // Adjust based on actual plan schema
                    resourceTitle = `Plan Subscription: ${plan.name}`;
                    break;

                case 'RENT': // Helper for generic rent if pointed to a lease/unit via 'RENT' type? 
                    // Or maybe user meant RENT_REQUEST. Let's assume generic RENT points to a lease for now
                    const genericLease = await this.mongoDb.findOne('leases', resourceId);
                    if (!genericLease) throw new NotFoundException('Lease/Rent resource not found');
                    amount = genericLease.rentAmount;
                    resourceTitle = `Rent Payment`;
                    break;

                default:
                    throw new BadRequestException('Invalid resource type');
            }

            if (!amount || amount <= 0) {
                throw new BadRequestException('Invalid payment amount from resource');
            }

            const reference = this.generatePaymentReference();

            // Save pending payment to DB
            await this.mongoDb.create(this.collectionName, {
                userId,
                amount,
                reference,
                status: 'PENDING',
                paymentMethod: 'paystack',
                resourceId,
                resourceType,
                metadata,
                email,
                title: resourceTitle,
            });

            const payload = {
                amount: amount * 100, // Paystack expects amount in kobo
                email,
                reference,
                metadata: {
                    ...metadata,
                    userId,
                    resourceId,
                    resourceType,
                    custom_fields: [
                        {
                            display_name: "User ID",
                            variable_name: "user_id",
                            value: userId
                        },
                        {
                            display_name: "Resource",
                            variable_name: "resource",
                            value: `${resourceType} - ${resourceId}`
                        }
                    ]
                },
            };

            const headers = {
                Authorization: `Bearer ${this.configService.getOrThrow('PAYSTACK_SECRET_KEY')}`,
                'Content-Type': 'application/json',
            };

            const response = await fetch(
                `${this.configService.getOrThrow('PAYSTACK_BASE_URL')}/transaction/initialize`,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                },
            );

            const data: any = await response.json();

            if (!data.status) {
                throw new BadRequestException(data.message || 'Payment initialization failed');
            }

            return {
                authorization_url: data.data.authorization_url,
                access_code: data.data.access_code,
                reference,
                amount,
                resourceId,
                resourceType,
                title: resourceTitle,
            };
        } catch (error: any) {
            this.logger.error(`Payment initialization error: ${error.message}`);
            throw new InternalServerErrorException(error.message);
        }
    }

    async verifyPayment(reference: string) {
        try {
            const headers = {
                Authorization: `Bearer ${this.configService.getOrThrow('PAYSTACK_SECRET_KEY')}`,
            };

            const response = await fetch(
                `${this.configService.getOrThrow('PAYSTACK_BASE_URL')}/transaction/verify/${reference}`,
                {
                    method: 'GET',
                    headers,
                },
            );

            const data: any = await response.json();

            if (!data.status) {
                throw new BadRequestException('Payment verification failed');
            }

            if (data.data.status === 'success') {
                const payment = await this.mongoDb.findOneBy(this.collectionName, { reference });

                if (payment && payment.status !== 'SUCCESS') {
                    await this.mongoDb.update(this.collectionName, payment.id, {
                        status: 'SUCCESS',
                        paidAt: new Date(),
                        gatewayResponse: data.data,
                    });
                }
                return data.data;
            }

            return data.data;
        } catch (error: any) {
            this.logger.error(`Payment verification error: ${error.message}`);
            throw error;
        }
    }

    async handleWebhook(signature: string, payload: any) {
        const secret = this.configService.getOrThrow('PAYSTACK_SECRET_KEY');
        const hash = createHmac('sha512', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (hash !== signature) {
            this.logger.warn('Invalid webhook signature');
            throw new BadRequestException('Invalid signature');
        }

        const { event, data } = payload;

        if (event === 'charge.success') {
            const reference = data.reference;

            this.logger.log(`Processing successful payment for ${reference}`);

            const payment = await this.mongoDb.findOneBy(this.collectionName, { reference });

            if (payment) {
                if (payment.status !== 'SUCCESS') {
                    await this.mongoDb.update(this.collectionName, payment.id, {
                        status: 'SUCCESS',
                        paidAt: new Date(),
                        gatewayResponse: data,
                    });
                    this.logger.log(`Payment ${reference} updated to SUCCESS`);

                    // Audit Log
                    await this.auditLogsService.create({
                        userId: payment.userId,
                        action: 'PAYMENT_SUCCESS',
                        entityType: 'payment',
                        entityId: payment.id,
                        details: { amount: payment.amount, reference },
                        createdAt: new Date(),
                    });

                    // Notification
                    await this.notificationsService.create({
                        userId: payment.userId,
                        title: 'Payment Successful',
                        message: `Payment of ${payment.amount} for ${payment.title} was successful.`,
                        type: 'PAYMENT_SUCCESS',
                        entityId: payment.id,
                    });

                    // Propagate to Rent Request if applicable
                    if (payment.resourceType === 'RENT_REQUEST') {
                        await this.mongoDb.update('rent-requests', payment.resourceId, {
                            isPaid: true,
                            paidAt: new Date(),
                            status: 'paid'
                        });
                        // If logic requires, auto-generate lease here or notify manager
                        await this.notificationsService.create({
                            userId: payment.userId,
                            title: 'Rent Request Paid',
                            message: 'Your rent request is marked as paid.',
                            type: 'RENT_PAID',
                            entityId: payment.resourceId,
                        });
                    }

                } else {
                    this.logger.log(`Payment ${reference} already marked as SUCCESS`);
                }
            } else {
                this.logger.error(`Payment record not found for reference ${reference} in webhook`);
            }
        }

        return true;
    }

    async findAll(userId?: string, role?: string, page = 1, limit = 10, status?: string) {
        const skip = (page - 1) * limit;
        const filter: any = {};

        if (status) {
            filter.status = status;
        }

        // Role-based filtering
        if (role !== 'admin' && role !== 'owner') { // assuming admin/owner can see all
            filter.userId = userId;
        }

        const [items, total] = await Promise.all([
            this.mongoDb.findAll(this.collectionName, filter, { skip, limit, sort: { createdAt: -1 } }),
            this.mongoDb.count(this.collectionName, filter)
        ]);

        return {
            data: items,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async findOne(id: string, userId?: string, role?: string) {
        const payment = await this.mongoDb.findOne(this.collectionName, id);
        if (!payment) {
            throw new BadRequestException('Payment not found');
        }

        if (role !== 'admin' && role !== 'owner' && payment.userId !== userId) {
            throw new UnauthorizedException('Unauthorized access to this payment');
        }

        return payment;
    }
}
