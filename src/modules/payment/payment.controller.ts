import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    Headers,
    HttpCode,
    HttpStatus,
    UseGuards,
    Req,
    Query,
    DefaultValuePipe,
    ParseIntPipe,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { InitializePaymentDto } from './dto/initialize-payment.dto';

interface AuthenticatedRequest {
    user: {
        id: string;
        email: string;
        role: string;
    };
}

@Controller('payments')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Post('initialize')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiTags('Tenant Portal')
    @ApiOperation({ summary: 'Initialize a payment' })
    @ApiResponse({ status: 201, description: 'Payment initialized successfully' })
    async initializePayment(
        @Req() req: any,
        @Body() initializePaymentDto: InitializePaymentDto
    ) {
        const user = req.user;
        return this.paymentService.initializePayment(
            user.id,
            user.email,
            initializePaymentDto.resourceId,
            initializePaymentDto.resourceType,
            initializePaymentDto.metadata,
        );
    }

    @Get('verify/:reference')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiTags('Tenant Portal')
    @ApiOperation({ summary: 'Verify a payment' })
    @ApiResponse({ status: 200, description: 'Payment verified' })
    async verifyPayment(@Param('reference') reference: string) {
        return this.paymentService.verifyPayment(reference);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiTags('Admin Portal', 'Tenant Portal')
    @ApiOperation({ summary: 'Get all payments' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Return all payments' })
    async findAll(
        @Req() req: any,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
        @Query('status') status?: string,
    ) {
        const user = req.user;
        return this.paymentService.findAll(user.id, user.role, page, limit, status);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiTags('Admin Portal', 'Tenant Portal')
    @ApiOperation({ summary: 'Get a payment by database ID or reference' })
    @ApiParam({ name: 'id', description: 'Either the MongoDB document ID or the payment reference returned during initialization' })
    @ApiResponse({ status: 200, description: 'Return a payment' })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    async findOne(@Req() req: any, @Param('id') id: string) {
        const user = req.user;
        return this.paymentService.findOne(id, user.id, user.role);
    }

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Paystack Webhook', tags: ['System'] })
    async handleWebhook(
        @Headers('x-paystack-signature') signature: string,
        @Body() payload: any,
    ) {
        return this.paymentService.handleWebhook(signature, payload);
    }
}
