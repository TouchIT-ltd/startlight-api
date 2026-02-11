import { IsString, IsNotEmpty, IsOptional, IsObject, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitializePaymentDto {
    @ApiProperty({
        example: 'mongo_id_123',
        description: 'The ID of the resource being paid for',
    })
    @IsString()
    @IsNotEmpty()
    resourceId!: string;

    @ApiProperty({
        example: 'RENT',
        description: 'The type of resource (RENT, LEASE, PLAN, UNIT, RENT_REQUEST)',
        enum: ['RENT', 'LEASE', 'PLAN', 'UNIT', 'RENT_REQUEST'],
    })
    @IsString()
    @IsNotEmpty()
    @IsIn(['RENT', 'LEASE', 'PLAN', 'UNIT', 'RENT_REQUEST'])
    resourceType!: string;

    @ApiProperty({
        example: { custom_field: 'value' },
        description: 'Additional metadata for the payment',
        required: false,
    })
    @IsOptional()
    @IsObject()
    metadata?: any;
}
