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
import { LeasesService } from '../leases/leases.service';
import { UnitsService } from '../units/units.service';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly collectionName = 'payments';

    constructor(
        private readonly configService: ConfigService,
        private readonly mongoDb: MongoDatabaseService,
        private readonly auditLogsService: AuditLogsService,
        private readonly notificationsService: NotificationsService,
        private readonly leasesService: LeasesService,
        private readonly unitsService: UnitsService,
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
        email: string,
        resourceId: string,
        resourceType: string,
        metadata: any = {},
    ) {
        this.logger.log(`initializePayment called userId=${userId} resourceType=${resourceType} resourceId=${resourceId}`);
        try {
            // Use email from JWT token (already verified by guard)
            // No need for database lookup of user

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
            const errorResponse = {
                message: `Payment initialization failed: ${error.message}`,
                error: error.message,
                code: error.code || 'INIT_PAYMENT_ERROR',
                timestamp: new Date().toISOString(),
                userId,
                resourceType,
                resourceId,
                details: {
                    stack: error.stack,
                    response: error.response?.data || null,
                }
            };
            this.logger.error('Payment initialization error:', errorResponse);
            throw new InternalServerErrorException(errorResponse);
        }
    }

    async verifyPayment(reference: string) {
        this.logger.log(`verifyPayment called for reference=${reference}`);
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

            // Attempt to update local record regardless of success so we keep track of aborted/failed payments
            const payment = await this.mongoDb.findOneBy(this.collectionName, { reference });

            if (payment) {
                const newStatus = data.data.status?.toUpperCase() || payment.status;
                const updatePayload: any = { gatewayResponse: this.normalizePaystackAmount(data.data) };

                if (newStatus === 'SUCCESS' && payment.status !== 'SUCCESS') {
                    updatePayload.status = 'SUCCESS';
                    updatePayload.paidAt = new Date();

                    // Process successful payment: create lease, mark unit occupied, etc.
                    await this._processSuccessfulPayment(payment);
                } else if (newStatus !== 'SUCCESS' && payment.status === 'PENDING') {
                    // mark as abandoned or failed so that frontend can reflect it
                    updatePayload.status = newStatus;
                }

                await this.mongoDb.update(this.collectionName, payment.id, updatePayload);
            }

            return this.normalizePaystackAmount(data.data);
        } catch (error: any) {
            const errorResponse = {
                message: `Payment verification failed: ${error.message}`,
                error: error.message,
                reference,
                code: error.code || 'VERIFY_PAYMENT_ERROR',
                timestamp: new Date().toISOString(),
                details: {
                    stack: error.stack,
                    response: error.response?.data || null,
                }
            };
            this.logger.error('Payment verification error:', errorResponse);
            throw new BadRequestException(errorResponse);
        }
    }

    private async _processSuccessfulPayment(payment: any) {
        this.logger.log(`_processSuccessfulPayment start for payment.id=${payment.id} resourceType=${payment.resourceType}`);
        // Audit Log
        await this.auditLogsService.create({
            userId: payment.userId,
            action: 'PAYMENT_SUCCESS',
            entityType: 'payment',
            entityId: payment.id,
            details: { amount: payment.amount, reference: payment.reference },
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

        // Handle RENT_REQUEST payment: create lease, mark unit occupied
        if (payment.resourceType === 'RENT_REQUEST') {
            const rentRequest = await this.mongoDb.findOne('rent-requests', payment.resourceId);
            if (rentRequest) {
                await this.mongoDb.update('rent-requests', payment.resourceId, {
                    isPaid: true,
                    paidAt: new Date(),
                    status: 'paid'
                });

                // Create lease automatically when a rent request is paid
                try {
                    // Fetch unit linked to this rent request
                    const unit = await this.mongoDb.findOne('units', rentRequest.unitId);
                    if (unit) {
                        const now = new Date();
                        const startDate = now.toISOString().split('T')[0];
                        const end = new Date(now);
                        end.setFullYear(end.getFullYear() + 1); // default 12-month lease
                        const endDate = end.toISOString().split('T')[0];

                        const leaseData: any = {
                            userId: rentRequest.userId,
                            propertyId: unit.propertyId,
                            unitNumber: unit.unitNumber,
                            startDate,
                            endDate,
                            rentAmount: rentRequest.amount || unit.price,
                            status: 'active',
                        };

                        const createdLease = await this.leasesService.create(leaseData);
                        this.logger.log(`lease created id=${createdLease.id}`);

                        // Mark unit as occupied and link tenant
                        await this.unitsService.update(unit.id, {
                            status: 'occupied',
                            tenantId: rentRequest.userId,
                        });

                        // Cancel other pending rent requests for this unit
                        await this.mongoDb.updateMany('rent-requests', { unitId: unit.id, status: 'pending' }, { status: 'cancelled' });

                        await this.notificationsService.create({
                            userId: rentRequest.userId,
                            title: 'Lease Created',
                            message: `Lease created for unit ${unit.unitNumber}.`,
                            type: 'LEASE_CREATED',
                            entityId: createdLease.id,
                        });
                    } else {
                        // If unit not found, just notify
                        await this.notificationsService.create({
                            userId: rentRequest.userId,
                            title: 'Rent Request Paid',
                            message: 'Your rent request is marked as paid. Unit information could not be resolved to auto-create a lease.',
                            type: 'RENT_PAID',
                            entityId: payment.resourceId,
                        });
                    }
                } catch (err) {
                    this.logger.error('Failed to auto-create lease after payment: ' + String(err));
                }
            }
        }

        // Handle UNIT payment: create lease directly for this unit
        if (payment.resourceType === 'UNIT') {
            try {
                const unit = await this.mongoDb.findOne('units', payment.resourceId);
                if (unit) {
                    const now = new Date();
                    const startDate = now.toISOString().split('T')[0];
                    const end = new Date(now);
                    end.setFullYear(end.getFullYear() + 1); // default 12-month lease
                    const endDate = end.toISOString().split('T')[0];

                    const leaseData: any = {
                        userId: payment.userId,
                        propertyId: unit.propertyId,
                        unitNumber: unit.unitNumber,
                        startDate,
                        endDate,
                        rentAmount: unit.price,
                        status: 'active',
                    };

                    const createdLease = await this.leasesService.create(leaseData);

                    // Mark unit as occupied and link tenant
                    await this.unitsService.update(unit.id, {
                        status: 'occupied',
                        tenantId: payment.userId,
                    });

                    await this.notificationsService.create({
                        userId: payment.userId,
                        title: 'Lease Created',
                        message: `Lease created for unit ${unit.unitNumber}.`,
                        type: 'LEASE_CREATED',
                        entityId: createdLease.id,
                    });
                }
            } catch (err) {
                this.logger.error('Failed to auto-create lease for UNIT payment: ' + String(err));
            }
        }
    }

    async handleWebhook(signature: string, payload: any) {
        this.logger.log(`webhook received with event=${payload.event}`);
        try {
            const secret = this.configService.getOrThrow('PAYSTACK_SECRET_KEY');
            const hash = createHmac('sha512', secret)
                .update(JSON.stringify(payload))
                .digest('hex');

            if (hash !== signature) {
                this.logger.warn('Invalid webhook signature');
                throw new BadRequestException('Invalid signature');
            }
            const { event, data } = payload;
            this.logger.log(`webhook received event=${event}`);

            if (event === 'charge.success') {
                const reference = data.reference;

                this.logger.log(`Processing successful payment for ${reference}`);

                const payment = await this.mongoDb.findOneBy(this.collectionName, { reference });

                if (payment) {
                    if (payment.status !== 'SUCCESS') {
                        // Mark as SUCCESS first to prevent race condition if verifyPayment is called simultaneously
                        await this.mongoDb.update(this.collectionName, payment.id, {
                            status: 'SUCCESS',
                            paidAt: new Date(),
                            gatewayResponse: this.normalizePaystackAmount(data),
                        });
                        this.logger.log(`Payment ${reference} updated to SUCCESS via webhook`);

                        // Process the payment (creates lease, etc.)
                        await this._processSuccessfulPayment(payment);
                    } else {
                        this.logger.log(`Payment ${reference} already marked as SUCCESS`);
                    }
                } else {
                    this.logger.error(`Payment record not found for reference ${reference} in webhook`);
                }
            }

            return true;
        } catch (error: any) {
            const errorResponse = {
                message: `Webhook processing failed: ${error.message}`,
                error: error.message,
                event: payload?.event,
                code: 'WEBHOOK_ERROR',
                timestamp: new Date().toISOString(),
                details: {
                    stack: error.stack,
                    payload: payload ? { event: payload.event, reference: payload.data?.reference } : null,
                }
            };
            this.logger.error('Webhook processing error:', errorResponse);
            throw new InternalServerErrorException(errorResponse);
        }
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

    async findOne(idOrReference: string, userId?: string, role?: string) {
        // try to locate by database id first
        let payment = await this.mongoDb.findOne(this.collectionName, idOrReference);

        // if not found by id, try by reference (frontend often has reference available)
        if (!payment) {
            payment = await this.mongoDb.findOneBy(this.collectionName, { reference: idOrReference });
        }

        if (!payment) {
            throw new BadRequestException('Payment not found');
        }

        // enforce visibility rules
        if (role !== 'admin' && role !== 'owner' && payment.userId !== userId) {
            throw new UnauthorizedException('Unauthorized access to this payment');
        }

        return payment;
    }

    /**
     * Convert Paystack gateway response amounts from kobo to Naira
     * Paystack stores amounts in kobo (100 kobo = 1 Naira)
     */
    private normalizePaystackAmount(gatewayResponse: any): any {
        if (!gatewayResponse) return gatewayResponse;

        const normalized = { ...gatewayResponse };

        // Convert main amount fields from kobo to Naira
        if (normalized.amount) {
            normalized.amount = Math.round(normalized.amount / 100);
        }
        if (normalized.requested_amount) {
            normalized.requested_amount = Math.round(normalized.requested_amount / 100);
        }
        if (normalized.fees) {
            normalized.fees = Math.round(normalized.fees / 100);
        }

        return normalized;
    }
}
